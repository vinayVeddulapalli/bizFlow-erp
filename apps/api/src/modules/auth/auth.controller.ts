import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public, CurrentUser } from '../../common/decorators/current-user.decorator';
import { registerSchema, loginSchema } from '@bizflow/validation';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and organization' })
  async register(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const validated = registerSchema.parse(body);
    const result = await this.authService.register(validated);

    // Set secure HTTP-only refresh cookie
    res.cookie('bizflow_refresh', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  async login(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const validated = loginSchema.parse(body);
    const result = await this.authService.login(validated);

    res.cookie('bizflow_refresh', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh short-lived access JWT' })
  async refresh(
    @CurrentUser('id') userId: string,
    @Req() req: Request
  ) {
    const orgId = req.headers['x-organization-id'] as string;
    return this.authService.refreshTokens(userId, orgId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate session cookie' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('bizflow_refresh');
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and accessible organizations' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
