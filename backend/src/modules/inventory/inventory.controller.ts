import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { InventoryService } from './inventory.service';
import { CreateInventoryProductDto } from './dto/create-inventory-product.dto';
import { UpdateInventoryProductDto } from './dto/update-inventory-product.dto';
import { QueryInventoryProductDto } from './dto/query-inventory-product.dto';
import { CreateInventoryLotDto } from './dto/create-inventory-lot.dto';
import { UpdateInventoryLotDto } from './dto/update-inventory-lot.dto';
import { QueryInventoryLotDto } from './dto/query-inventory-lot.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ----- Products -----

  @Post('products')
  async createProduct(
    @Body() dto: CreateInventoryProductDto,
    @Request() req: any,
  ) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const data = await this.inventoryService.createProduct(dto, currentUser);
    return { success: true, message: 'สร้างสินค้าเรียบร้อยแล้ว', data };
  }

  @Get('products')
  async findAllProducts(@Query() query: QueryInventoryProductDto) {
    const result = await this.inventoryService.findAllProducts(query);
    return { success: true, ...result };
  }

  @Get('products/:id')
  async findOneProduct(@Param('id', ParseIntPipe) id: number) {
    const data = await this.inventoryService.findOneProduct(id);
    return { success: true, data };
  }

  @Patch('products/:id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryProductDto,
    @Request() req: any,
  ) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const data = await this.inventoryService.updateProduct(id, dto, currentUser);
    return { success: true, message: 'อัปเดตสินค้าเรียบร้อยแล้ว', data };
  }

  // ----- Lots -----

  @Post('lots')
  async createLot(@Body() dto: CreateInventoryLotDto, @Request() req: any) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const data = await this.inventoryService.createLot(dto, currentUser);
    return { success: true, message: 'รับสินค้าเข้าล็อตเรียบร้อยแล้ว', data };
  }

  @Get('lots')
  async findAllLots(@Query() query: QueryInventoryLotDto) {
    const result = await this.inventoryService.findAllLots(query);
    return { success: true, ...result };
  }

  @Get('lots/:id')
  async findOneLot(@Param('id', ParseIntPipe) id: number) {
    const data = await this.inventoryService.findOneLot(id);
    return { success: true, data };
  }

  @Patch('lots/:id')
  async updateLot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryLotDto,
    @Request() req: any,
  ) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const data = await this.inventoryService.updateLot(id, dto, currentUser);
    return { success: true, message: 'อัปเดตล็อตสินค้าเรียบร้อยแล้ว', data };
  }
}
