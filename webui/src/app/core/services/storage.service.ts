import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CabinetLot,
  CabinetPayload,
  Placement,
  RoomList,
  RoomPayload,
  StorageCabinet,
  StorageCabinetDetail,
  StorageRoomDetail,
} from '../models/storage.model';

interface Res<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ตู้เก็บยา + ตำแหน่งล็อตในตู้ (/api/storage)
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly api = `${environment.apiUrl}/storage`;

  constructor(private http: HttpClient) {}

  cabinets(): Observable<Res<StorageCabinet[]>> {
    return this.http.get<Res<StorageCabinet[]>>(`${this.api}/cabinets`);
  }

  cabinet(id: number): Observable<Res<StorageCabinetDetail>> {
    return this.http.get<Res<StorageCabinetDetail>>(`${this.api}/cabinets/${id}`);
  }

  create(payload: CabinetPayload): Observable<Res<StorageCabinetDetail>> {
    return this.http.post<Res<StorageCabinetDetail>>(`${this.api}/cabinets`, payload);
  }

  update(id: number, payload: Partial<CabinetPayload>): Observable<Res<StorageCabinetDetail>> {
    return this.http.patch<Res<StorageCabinetDetail>>(`${this.api}/cabinets/${id}`, payload);
  }

  remove(id: number): Observable<Res<{ id: number }>> {
    return this.http.delete<Res<{ id: number }>>(`${this.api}/cabinets/${id}`);
  }

  // ----- ห้อง -----

  rooms(): Observable<Res<RoomList>> {
    return this.http.get<Res<RoomList>>(`${this.api}/rooms`);
  }

  room(id: number): Observable<Res<StorageRoomDetail>> {
    return this.http.get<Res<StorageRoomDetail>>(`${this.api}/rooms/${id}`);
  }

  createRoom(payload: RoomPayload): Observable<Res<StorageRoomDetail>> {
    return this.http.post<Res<StorageRoomDetail>>(`${this.api}/rooms`, payload);
  }

  updateRoom(id: number, payload: Partial<RoomPayload>): Observable<Res<StorageRoomDetail>> {
    return this.http.patch<Res<StorageRoomDetail>>(`${this.api}/rooms/${id}`, payload);
  }

  removeRoom(id: number): Observable<Res<{ id: number; unassigned_cabinets: number }>> {
    return this.http.delete<Res<{ id: number; unassigned_cabinets: number }>>(`${this.api}/rooms/${id}`);
  }

  saveLayout(roomId: number, items: Placement[]): Observable<Res<StorageRoomDetail>> {
    return this.http.put<Res<StorageRoomDetail>>(`${this.api}/rooms/${roomId}/layout`, { items });
  }

  // ----- ล็อต -----

  unplacedLots(): Observable<Res<CabinetLot[]>> {
    return this.http.get<Res<CabinetLot[]>>(`${this.api}/unplaced-lots`);
  }

  // compartmentId = null → เอาออกจากตู้
  setLotLocation(lotId: number, compartmentId: number | null, level?: number | null): Observable<Res<CabinetLot>> {
    return this.http.patch<Res<CabinetLot>>(`${this.api}/lots/${lotId}/location`, { compartment_id: compartmentId, level: level ?? null });
  }
}
