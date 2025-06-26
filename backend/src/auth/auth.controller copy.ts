// src/auth/auth.controller.ts
import { Controller, Post, Req, Res, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {

  constructor(private authService: AuthService) { }
  @Get('csrf-token')
  getCsrfToken(@Req() req: Request) {
    return { csrfToken: req.csrfToken() };
  }
  
  @Post('login')
  async login(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    // const user = await this.authService.validateUser(body.username, body.password);
    // if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // const payload = { sub: user.id, username: user.username, role: user.role };
    // const token = this.authService.generateJwt(payload); // => jwtService.sign()
    // console.log(token)
    // // ✅ Set HttpOnly cookie
    // res.cookie('token', token, {
    //   httpOnly: true,
    //   secure: false, // ตั้ง true ถ้าใช้ https
    //   sameSite: 'strict',
    // });

    // // ✅ ส่ง csrfToken ให้ client
    // res.json({ csrfToken: req.csrfToken() });
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.authService.generateJwt(payload);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });

    // ไม่ต้องส่ง csrfToken ใน login เพราะยังไม่มี csrfToken
    res.json({ message: 'Login successful' });
  }

  @Post('guest')
  async guestLogin(@Req() req: Request, @Res() res: Response) {
    const guestToken = this.authService.loginAsGuest().access_token;
    res.cookie('token', guestToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });
    res.json({ csrfToken: req.csrfToken() });
  }
}

// @Post('login')
// async login(@Body() body: { username: string; password: string }) {
//   const user = await this.authService.validateUser(body.username, body.password);
//   if (!user) {
//     throw new UnauthorizedException('Invalid credentials');
//   }
//   return this.authService.login(user);
// }

// @Post('guest')
// loginAsGuest() {
//   return this.authService.loginAsGuest();
// }