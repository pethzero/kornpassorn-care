import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, MoreThan, Not, Repository } from 'typeorm';

import { StorageCabinet, StorageCompartment, StorageRoom } from '../../database/entities/storage.entity';
import { InventoryProductLot } from '../../database/entities/inventory.entity';
import {
  CompartmentDto,
  CreateCabinetDto,
  CreateRoomDto,
  SaveLayoutDto,
  SetLotLocationDto,
  UpdateCabinetDto,
  UpdateRoomDto,
} from './dto/storage.dto';

// ใกล้หมดอายุ = เหลือไม่เกินกี่วัน (ตรงกับสีส้มในหน้า 3D)
const EXPIRING_DAYS = 90;

// ตู้ที่วางในห้อง — พอสำหรับตรวจว่าล้นห้อง/ทับกันไหม
type Placed = Pick<StorageCabinet, 'id' | 'code' | 'width_cm' | 'depth_cm' | 'pos_x_cm' | 'pos_z_cm' | 'rotation'>;

// รอยตู้บนพื้น (หมุน 90/270 → กว้างกับลึกสลับกัน)
function footprint(c: Placed) {
  const turned = c.rotation % 180 !== 0;
  const w = turned ? c.depth_cm : c.width_cm;
  const d = turned ? c.width_cm : c.depth_cm;
  return { x0: c.pos_x_cm - w / 2, x1: c.pos_x_cm + w / 2, z0: c.pos_z_cm - d / 2, z1: c.pos_z_cm + d / 2 };
}

// ข้อมูลล็อตที่หน้าตู้ต้องใช้ (ไม่ส่งต้นทุน/ผู้บันทึก ฯลฯ)
function lotView(l: InventoryProductLot) {
  return {
    id: l.id,
    lot_no: l.lot_no,
    product_id: l.product_id,
    product_name: l.product?.name,
    brand: l.product?.brand ?? l.brand ?? null,
    unit: l.product?.unit,
    quantity_remaining: Number(l.quantity_remaining),
    expiry_date: l.expiry_date ?? null,
    storage_compartment_id: l.storage_compartment_id ?? null,
    storage_level: l.storage_level ?? null,
  };
}

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(StorageRoom) private readonly roomRepo: Repository<StorageRoom>,
    @InjectRepository(StorageCabinet) private readonly cabinetRepo: Repository<StorageCabinet>,
    @InjectRepository(StorageCompartment) private readonly compartmentRepo: Repository<StorageCompartment>,
    @InjectRepository(InventoryProductLot) private readonly lotRepo: Repository<InventoryProductLot>,
    private readonly dataSource: DataSource,
  ) {}

  // ----- ตู้ -----

  async listCabinets() {
    const cabinets = await this.cabinetRepo.find({
      relations: ['compartments', 'room'],
      order: { sort_order: 'ASC', code: 'ASC', compartments: { sort_order: 'ASC', id: 'ASC' } },
    });
    // นับล็อตที่ยังมีของในแต่ละช่อง + หมดอายุแล้ว / ใกล้หมดอายุ (≤ 90 วัน) — โชว์ป้ายเตือนบนการ์ดตู้
    const counts: { compartment_id: number; lots: string; expired: string; expiring: string }[] = await this.lotRepo
      .createQueryBuilder('l')
      .select('l.storage_compartment_id', 'compartment_id')
      .addSelect('COUNT(*)', 'lots')
      .addSelect('COUNT(*) FILTER (WHERE l.expiry_date < CURRENT_DATE)', 'expired')
      .addSelect(`COUNT(*) FILTER (WHERE l.expiry_date >= CURRENT_DATE AND l.expiry_date <= CURRENT_DATE + ${EXPIRING_DAYS})`, 'expiring')
      .where('l.storage_compartment_id IS NOT NULL AND l.quantity_remaining > 0')
      .groupBy('l.storage_compartment_id')
      .getRawMany();
    const byComp = new Map(
      counts.map((c) => [Number(c.compartment_id), { lot_count: Number(c.lots), expired_count: Number(c.expired), expiring_count: Number(c.expiring) }]),
    );
    const none = { lot_count: 0, expired_count: 0, expiring_count: 0 };
    return cabinets.map((c) => {
      const comps = c.compartments.map((p) => ({ ...p, ...(byComp.get(p.id) ?? none) }));
      const sum = (k: keyof typeof none) => comps.reduce((s, p) => s + p[k], 0);
      return { ...c, compartments: comps, lot_count: sum('lot_count'), expired_count: sum('expired_count'), expiring_count: sum('expiring_count') };
    });
  }

  // ตู้ + ช่อง + ล็อตที่ยังมีของในแต่ละช่อง
  async getCabinet(id: number) {
    const cabinet = await this.cabinetRepo.findOne({
      where: { id },
      relations: ['compartments', 'room'],
      order: { compartments: { sort_order: 'ASC', id: 'ASC' } },
    });
    if (!cabinet) throw new NotFoundException('ไม่พบตู้');
    const lots = await this.lotsIn(cabinet.compartments.map((c) => c.id));
    return { ...cabinet, lots: lots.map(lotView) };
  }

  async createCabinet(dto: CreateCabinetDto, user: string) {
    await this.ensureCodeFree(dto.code);
    this.checkLayout(dto, dto.compartments);
    const place: Omit<Placed, 'id' | 'code' | 'width_cm' | 'depth_cm'> & { room_id: number | null } = {
      room_id: dto.room_id ?? null,
      pos_x_cm: dto.pos_x_cm ?? -1,
      pos_z_cm: dto.pos_z_cm ?? -1,
      rotation: dto.rotation ?? 0,
    };
    if (place.room_id) {
      const probe = { id: 0, code: dto.code.trim(), width_cm: dto.width_cm, depth_cm: dto.depth_cm, ...place };
      await this.checkPlacementInRoom(place.room_id, probe);
      Object.assign(place, { pos_x_cm: probe.pos_x_cm, pos_z_cm: probe.pos_z_cm });
    } else {
      Object.assign(place, { pos_x_cm: 0, pos_z_cm: 0 });
    }
    const cabinet = this.cabinetRepo.create({
      code: dto.code.trim(),
      name: dto.name.trim(),
      ...place,
      width_cm: dto.width_cm,
      height_cm: dto.height_cm,
      depth_cm: dto.depth_cm,
      color: dto.color || undefined,
      note: dto.note || null,
      create_by: user,
      compartments: dto.compartments.map((c, i) => this.compartmentRepo.create(this.compartmentFields(c, i))),
    });
    const saved = await this.cabinetRepo.save(cabinet);
    return this.getCabinet(saved.id);
  }

  async updateCabinet(id: number, dto: UpdateCabinetDto, user: string) {
    const cabinet = await this.cabinetRepo.findOne({ where: { id }, relations: ['compartments'] });
    if (!cabinet) throw new NotFoundException('ไม่พบตู้');
    if (dto.code && dto.code.trim() !== cabinet.code) await this.ensureCodeFree(dto.code, id);

    const size = {
      width_cm: dto.width_cm ?? cabinet.width_cm,
      height_cm: dto.height_cm ?? cabinet.height_cm,
    };
    this.checkLayout(size, dto.compartments ?? cabinet.compartments);

    const roomId = dto.room_id !== undefined ? dto.room_id : cabinet.room_id;
    if (roomId) {
      const moved = roomId !== cabinet.room_id;
      const probe: Placed = {
        id: cabinet.id,
        code: dto.code?.trim() || cabinet.code,
        width_cm: size.width_cm,
        depth_cm: dto.depth_cm ?? cabinet.depth_cm,
        // ย้ายเข้าห้องใหม่โดยไม่บอกตำแหน่ง → กลางห้อง (ไปลากต่อในหน้าผังห้อง)
        pos_x_cm: dto.pos_x_cm ?? (moved ? -1 : cabinet.pos_x_cm),
        pos_z_cm: dto.pos_z_cm ?? (moved ? -1 : cabinet.pos_z_cm),
        rotation: dto.rotation ?? cabinet.rotation,
      };
      await this.checkPlacementInRoom(roomId, probe);
      Object.assign(dto, { pos_x_cm: probe.pos_x_cm, pos_z_cm: probe.pos_z_cm });
    }

    await this.dataSource.transaction(async (m) => {
      if (dto.compartments) {
        const keep = new Set(dto.compartments.filter((c) => c.id).map((c) => c.id));
        const removed = cabinet.compartments.filter((c) => !keep.has(c.id));
        if (removed.length) {
          const busy = await m.count(InventoryProductLot, {
            where: { storage_compartment_id: In(removed.map((c) => c.id)), quantity_remaining: MoreThan(0) },
          });
          if (busy) throw new ConflictException(`ช่องที่จะลบยังมีของอยู่ ${busy} ล็อต — ย้ายของออกก่อน`);
          await m.delete(StorageCompartment, removed.map((c) => c.id));
        }
        const owned = new Set(cabinet.compartments.map((c) => c.id));
        for (const [i, c] of dto.compartments.entries()) {
          if (c.id && !owned.has(c.id)) throw new BadRequestException(`ช่อง id ${c.id} ไม่ได้อยู่ในตู้นี้`);
          const fields = this.compartmentFields(c, i);
          if (c.id) await m.update(StorageCompartment, c.id, fields);
          else await m.insert(StorageCompartment, { ...fields, cabinet_id: id });
        }
        // ลดจำนวนชั้นแล้ว — ล็อตที่อยู่ชั้นที่หายไปย้ายมาชั้นล่างสุดที่เหลือ
        for (const c of dto.compartments.filter((x) => x.id)) {
          const levels = Math.max(1, c.levels ?? 1);
          await m.update(
            InventoryProductLot,
            { storage_compartment_id: c.id, storage_level: MoreThan(levels) },
            { storage_level: levels },
          );
        }
      }

      const { compartments: _ignored, ...fields } = dto;
      await m.update(StorageCabinet, id, {
        ...fields,
        ...(fields.code ? { code: fields.code.trim() } : {}),
        ...(fields.name ? { name: fields.name.trim() } : {}),
        modify_by: user,
        modify_date: new Date(),
      });
    });
    return this.getCabinet(id);
  }

  async removeCabinet(id: number) {
    const cabinet = await this.cabinetRepo.findOne({ where: { id }, relations: ['compartments'] });
    if (!cabinet) throw new NotFoundException('ไม่พบตู้');
    const ids = cabinet.compartments.map((c) => c.id);
    if (ids.length) {
      const busy = await this.lotRepo.count({ where: { storage_compartment_id: In(ids), quantity_remaining: MoreThan(0) } });
      if (busy) throw new ConflictException(`ตู้นี้ยังมีของอยู่ ${busy} ล็อต — ย้ายของออกก่อน`);
    }
    // ล็อตที่หมดแล้วแต่ยังชี้มาที่ช่องในตู้นี้ → FK ตั้ง NULL ให้เอง
    await this.cabinetRepo.delete(id);
    return { id };
  }

  // ----- ห้อง -----

  // ห้องทั้งหมด + จำนวนตู้/ล็อต + ตู้ที่ยังไม่ได้วางในห้องไหน
  async listRooms() {
    const [rooms, cabinets] = await Promise.all([
      this.roomRepo.find({ order: { sort_order: 'ASC', code: 'ASC' } }),
      this.listCabinets(),
    ]);
    return {
      rooms: rooms.map((r) => {
        const inRoom = cabinets.filter((c) => c.room_id === r.id);
        return {
          ...r,
          cabinet_count: inRoom.length,
          lot_count: inRoom.reduce((s, c) => s + c.lot_count, 0),
          expired_count: inRoom.reduce((s, c) => s + c.expired_count, 0),
          expiring_count: inRoom.reduce((s, c) => s + c.expiring_count, 0),
        };
      }),
      unassigned: cabinets.filter((c) => !c.room_id),
    };
  }

  // ห้อง + ทุกตู้ในห้อง (ช่อง + ล็อตที่มีของ) — พอสำหรับวาด 3D ทั้งห้อง
  async getRoom(id: number) {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('ไม่พบห้อง');
    const cabinets = await this.cabinetRepo.find({
      where: { room_id: id },
      relations: ['compartments'],
      order: { code: 'ASC', compartments: { sort_order: 'ASC', id: 'ASC' } },
    });
    const cabinetOf = new Map(cabinets.flatMap((c) => c.compartments.map((p) => [p.id, c.id] as const)));
    const lots = await this.lotsIn([...cabinetOf.keys()]);
    return {
      ...room,
      cabinets: cabinets.map((c) => ({
        ...c,
        lots: lots.filter((l) => cabinetOf.get(l.storage_compartment_id!) === c.id).map(lotView),
      })),
    };
  }

  async createRoom(dto: CreateRoomDto, user: string) {
    await this.ensureRoomCodeFree(dto.code);
    const saved = await this.roomRepo.save(
      this.roomRepo.create({
        code: dto.code.trim(),
        name: dto.name.trim(),
        width_cm: dto.width_cm,
        depth_cm: dto.depth_cm,
        note: dto.note?.trim() || null,
        create_by: user,
      }),
    );
    return this.getRoom(saved.id);
  }

  async updateRoom(id: number, dto: UpdateRoomDto, user: string) {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('ไม่พบห้อง');
    if (dto.code && dto.code.trim() !== room.code) await this.ensureRoomCodeFree(dto.code, id);
    // ย่อห้องแล้ว ตู้ทุกใบต้องยังอยู่ในห้อง
    const size = { width_cm: dto.width_cm ?? room.width_cm, depth_cm: dto.depth_cm ?? room.depth_cm };
    this.checkRoomLayout(size, await this.cabinetRepo.find({ where: { room_id: id } }));
    await this.roomRepo.update(id, {
      ...dto,
      ...(dto.code ? { code: dto.code.trim() } : {}),
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...('note' in dto ? { note: dto.note?.trim() || null } : {}),
      modify_by: user,
      modify_date: new Date(),
    });
    return this.getRoom(id);
  }

  // ลบห้อง — ตู้ในห้องไม่ถูกลบ แค่กลับเป็น "ยังไม่ได้วางในห้อง" (FK SET NULL)
  async removeRoom(id: number) {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('ไม่พบห้อง');
    const cabinets = await this.cabinetRepo.count({ where: { room_id: id } });
    await this.roomRepo.delete(id);
    return { id, unassigned_cabinets: cabinets };
  }

  // บันทึกตำแหน่ง/มุมหมุนของตู้ในห้องทีเดียว (จากหน้าออกแบบผังห้อง)
  async saveLayout(roomId: number, dto: SaveLayoutDto, user: string) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('ไม่พบห้อง');
    const cabinets = await this.cabinetRepo.find({ where: { room_id: roomId } });
    const byId = new Map(cabinets.map((c) => [c.id, c]));
    for (const item of dto.items) {
      const c = byId.get(item.cabinet_id);
      if (!c) throw new BadRequestException(`ตู้ id ${item.cabinet_id} ไม่ได้อยู่ในห้องนี้`);
      Object.assign(c, { pos_x_cm: item.pos_x_cm, pos_z_cm: item.pos_z_cm, rotation: item.rotation });
    }
    this.checkRoomLayout(room, cabinets);
    await this.dataSource.transaction(async (m) => {
      for (const item of dto.items) {
        await m.update(StorageCabinet, item.cabinet_id, {
          pos_x_cm: item.pos_x_cm,
          pos_z_cm: item.pos_z_cm,
          rotation: item.rotation,
          modify_by: user,
          modify_date: new Date(),
        });
      }
    });
    return this.getRoom(roomId);
  }

  // ----- ตำแหน่งล็อต -----

  // ล็อตที่ยังมีของ แต่ยังไม่ได้ระบุว่าเก็บไว้ที่ไหน (ให้เลือกเข้าช่อง)
  async unplacedLots() {
    const lots = await this.lotRepo.find({
      where: { storage_compartment_id: IsNull(), quantity_remaining: MoreThan(0) },
      relations: ['product'],
      order: { expiry_date: 'ASC', id: 'ASC' },
      take: 500,
    });
    return lots.map(lotView);
  }

  // ย้ายล็อตเข้าช่อง/ชั้น (ไม่ใช่การแก้ข้อมูลล็อต — ทำได้แม้ล็อตมีการเคลื่อนไหวแล้ว)
  async setLotLocation(lotId: number, dto: SetLotLocationDto, user: string) {
    const lot = await this.lotRepo.findOne({ where: { id: lotId }, relations: ['product'] });
    if (!lot) throw new NotFoundException('ไม่พบล็อต');

    if (dto.compartment_id == null) {
      lot.storage_compartment_id = null;
      lot.storage_level = null;
    } else {
      const comp = await this.compartmentRepo.findOne({ where: { id: dto.compartment_id } });
      if (!comp) throw new NotFoundException('ไม่พบช่องในตู้');
      const level = dto.level ?? 1;
      if (level > comp.levels) throw new BadRequestException(`ช่องนี้มี ${comp.levels} ชั้น`);
      lot.storage_compartment_id = comp.id;
      lot.storage_level = level;
    }
    lot.modify_by = user;
    lot.modify_date = new Date();
    await this.lotRepo.save(lot);
    return lotView(lot);
  }

  // ----- ภายใน -----

  private lotsIn(compartmentIds: number[]): Promise<InventoryProductLot[]> {
    if (!compartmentIds.length) return Promise.resolve([]);
    return this.lotRepo.find({
      where: { storage_compartment_id: In(compartmentIds), quantity_remaining: MoreThan(0) },
      relations: ['product'],
      order: { storage_level: 'ASC', expiry_date: 'ASC' },
    });
  }

  private async ensureRoomCodeFree(code: string, exceptId?: number) {
    const exists = await this.roomRepo.findOne({ where: { code: code.trim(), ...(exceptId ? { id: Not(exceptId) } : {}) } });
    if (exists) throw new ConflictException(`รหัสห้อง ${code} ถูกใช้แล้ว`);
  }

  // ตู้ใบเดียวเข้า/ย้ายในห้อง — ตรวจรวมกับตู้อื่นในห้องนั้น · pos = -1 → ตั้งกลางห้อง (แก้ค่าใน cabinet ให้)
  private async checkPlacementInRoom(roomId: number, cabinet: Placed) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new BadRequestException('ไม่พบห้องที่เลือก');
    if (cabinet.pos_x_cm < 0) cabinet.pos_x_cm = Math.round(room.width_cm / 2);
    if (cabinet.pos_z_cm < 0) cabinet.pos_z_cm = Math.round(room.depth_cm / 2);
    const others = await this.cabinetRepo.find({ where: { room_id: roomId, ...(cabinet.id ? { id: Not(cabinet.id) } : {}) } });
    this.checkRoomLayout(room, [...others, cabinet]);
  }

  // ทุกตู้ต้องอยู่บนพื้นห้อง และไม่วางทับกัน (ชิดกันได้)
  private checkRoomLayout(room: { width_cm: number; depth_cm: number }, cabinets: Placed[]) {
    const boxes = cabinets.map((c) => ({ c, f: footprint(c) }));
    for (const { c, f } of boxes) {
      if (f.x0 < 0 || f.z0 < 0 || f.x1 > room.width_cm || f.z1 > room.depth_cm) {
        throw new BadRequestException(`ตู้ ${c.code} ล้นขอบห้อง (${room.width_cm}×${room.depth_cm} ซม.)`);
      }
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].f;
        const b = boxes[j].f;
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1) {
          throw new BadRequestException(`ตู้ ${boxes[i].c.code} กับ ${boxes[j].c.code} วางทับกัน`);
        }
      }
    }
  }

  private async ensureCodeFree(code: string, exceptId?: number) {
    const exists = await this.cabinetRepo.findOne({ where: { code: code.trim(), ...(exceptId ? { id: Not(exceptId) } : {}) } });
    if (exists) throw new ConflictException(`รหัสตู้ ${code} ถูกใช้แล้ว`);
  }

  // ช่องต้องอยู่ในขอบตู้ และรหัสช่องห้ามซ้ำ (ไม่ตรวจการทับกัน — ตู้จริงบางแบบซ้อนกันได้ เช่น ลิ้นชักในบาน)
  private checkLayout(size: { width_cm: number; height_cm: number }, comps: Pick<CompartmentDto, 'code' | 'x_cm' | 'y_cm' | 'width_cm' | 'height_cm'>[]) {
    const codes = new Set<string>();
    for (const c of comps) {
      const code = c.code.trim().toUpperCase();
      if (!code) throw new BadRequestException('ทุกช่องต้องมีรหัส');
      if (codes.has(code)) throw new BadRequestException(`รหัสช่อง ${code} ซ้ำ`);
      codes.add(code);
      if (c.x_cm + c.width_cm > size.width_cm || c.y_cm + c.height_cm > size.height_cm) {
        throw new BadRequestException(`ช่อง ${code} ล้นขอบตู้ (${size.width_cm}×${size.height_cm} ซม.)`);
      }
    }
  }

  private compartmentFields(c: CompartmentDto, index: number) {
    return {
      code: c.code.trim().toUpperCase(),
      name: c.name?.trim() || null,
      x_cm: c.x_cm,
      y_cm: c.y_cm,
      width_cm: c.width_cm,
      height_cm: c.height_cm,
      front: c.front,
      door_count: c.front === 'glass' || c.front === 'solid' ? Math.max(1, c.door_count ?? 2) : 0,
      levels: c.front === 'drawer' ? 1 : Math.max(1, c.levels ?? 1),
      has_lock: !!c.has_lock,
      sort_order: index,
    };
  }
}
