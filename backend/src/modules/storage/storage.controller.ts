import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { StorageService } from './storage.service';
import { CreateCabinetDto, CreateRoomDto, SaveLayoutDto, SetLotLocationDto, UpdateCabinetDto, UpdateRoomDto } from './dto/storage.dto';

// ตู้เก็บยา/เวชภัณฑ์ + ตำแหน่งของล็อตในตู้ (หน้า 3D: /inventory/cabinets)
@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('cabinets')
  async list() {
    return { success: true, data: await this.storage.listCabinets() };
  }

  @Get('cabinets/:id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.storage.getCabinet(id) };
  }

  @Post('cabinets')
  async create(@Body() dto: CreateCabinetDto, @Request() req: any) {
    const data = await this.storage.createCabinet(dto, req.user?.username || 'anonymous');
    return { success: true, message: `เพิ่มตู้ ${data.code} แล้ว`, data };
  }

  @Patch('cabinets/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCabinetDto, @Request() req: any) {
    const data = await this.storage.updateCabinet(id, dto, req.user?.username || 'anonymous');
    return { success: true, message: `บันทึกตู้ ${data.code} แล้ว`, data };
  }

  @Delete('cabinets/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return { success: true, message: 'ลบตู้แล้ว', data: await this.storage.removeCabinet(id) };
  }

  // ----- ห้อง (หน้าออกแบบผังห้อง: /inventory/rooms) -----

  @Get('rooms')
  async listRooms() {
    return { success: true, data: await this.storage.listRooms() };
  }

  @Get('rooms/:id')
  async getRoom(@Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.storage.getRoom(id) };
  }

  @Post('rooms')
  async createRoom(@Body() dto: CreateRoomDto, @Request() req: any) {
    const data = await this.storage.createRoom(dto, req.user?.username || 'anonymous');
    return { success: true, message: `เพิ่ม "${data.name}" แล้ว`, data };
  }

  @Patch('rooms/:id')
  async updateRoom(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto, @Request() req: any) {
    const data = await this.storage.updateRoom(id, dto, req.user?.username || 'anonymous');
    return { success: true, message: `บันทึก "${data.name}" แล้ว`, data };
  }

  @Put('rooms/:id/layout')
  async saveLayout(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveLayoutDto, @Request() req: any) {
    const data = await this.storage.saveLayout(id, dto, req.user?.username || 'anonymous');
    return { success: true, message: 'บันทึกผังห้องแล้ว', data };
  }

  @Delete('rooms/:id')
  async removeRoom(@Param('id', ParseIntPipe) id: number) {
    const data = await this.storage.removeRoom(id);
    return { success: true, message: data.unassigned_cabinets ? `ลบห้องแล้ว — ตู้ ${data.unassigned_cabinets} ใบกลับเป็นยังไม่ได้วางในห้อง` : 'ลบห้องแล้ว', data };
  }

  @Get('unplaced-lots')
  async unplaced() {
    return { success: true, data: await this.storage.unplacedLots() };
  }

  @Patch('lots/:id/location')
  async setLocation(@Param('id', ParseIntPipe) id: number, @Body() dto: SetLotLocationDto, @Request() req: any) {
    const data = await this.storage.setLotLocation(id, dto, req.user?.username || 'anonymous');
    return { success: true, message: dto.compartment_id == null ? 'เอาออกจากตู้แล้ว' : 'ย้ายเข้าช่องแล้ว', data };
  }
}
