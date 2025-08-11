import { Controller, Get, UseGuards, Request, Post, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// DTO สำหรับทดสอบ
export class TestDataDto {
  message?: string;
}

@Controller('api/protected')
export class ProtectedController {
  
  // API ที่ไม่ต้องใช้ Token (สำหรับทดสอบ)
  @Get('public')
  getPublicData() {
    return {
      success: true,
      message: 'นี่คือข้อมูลสาธารณะ ไม่ต้องใช้ Token',
      data: {
        timestamp: new Date().toISOString(),
        public_info: 'ข้อมูลที่ทุกคนเข้าถึงได้'
      }
    };
  }

  // API ที่ต้องใช้ Token
  @UseGuards(JwtAuthGuard)
  @Get('user-info')
  getUserInfo(@Request() req: any) {
    return {
      success: true,
      message: 'ข้อมูลผู้ใช้จาก Token',
      data: {
        user: req.user,
        timestamp: new Date().toISOString(),
        auth_info: 'คุณได้รับอนุญาตให้เข้าถึงข้อมูลนี้แล้ว'
      }
    };
  }

  // API ราคาที่ต้องใช้ Token
  @UseGuards(JwtAuthGuard)
  @Get('prices')
  getPrices(@Request() req: any) {
    const mockPrices = [
      { service: 'ค่าตรวจรักษาทั่วไป', price: 500, currency: 'THB' },
      { service: 'ค่าตรวจเลือด', price: 200, currency: 'THB' },
      { service: 'ค่าเอ็กซเรย์', price: 300, currency: 'THB' },
      { service: 'ค่ายา', price: 150, currency: 'THB' },
    ];

    return {
      success: true,
      message: 'รายการราคาบริการ',
      data: {
        prices: mockPrices,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date().toISOString()
      }
    };
  }

  // API สำหรับแอดมินเท่านั้น
  @UseGuards(JwtAuthGuard)
  @Get('admin-only')
  getAdminData(@Request() req: any) {
    // ตรวจสอบ role
    if (req.user.role !== 'admin') {
      return {
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
        error: 'Insufficient permissions'
      };
    }

    return {
      success: true,
      message: 'ข้อมูลสำหรับแอดมินเท่านั้น',
      data: {
        admin_data: 'ข้อมูลลับสุดยอด',
        user: req.user,
        sensitive_info: 'รายได้รวม: ฿123,456'
      }
    };
  }

  // API สำหรับทดสอบส่งข้อมูล
  @UseGuards(JwtAuthGuard)
  @Post('test-data')
  postTestData(@Body() testData: TestDataDto, @Request() req: any) {
    return {
      success: true,
      message: 'ได้รับข้อมูลเรียบร้อยแล้ว',
      data: {
        received_data: testData,
        from_user: req.user.username,
        timestamp: new Date().toISOString()
      }
    };
  }
}
