import { Controller, Post, Body, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { RadiusService } from './radius.service';

@ApiTags('radius')
@Controller('radius')
export class RadiusController {
  constructor(private readonly radiusService: RadiusService) {}

  @Post('authorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FreeRADIUS authorization (internal)' })
  @ApiExcludeEndpoint()
  async authorize(@Body() body: any, @Res() res: Response) {
    const result = await this.radiusService.authorize(body);
    if (result.code === 200) {
      return res.status(HttpStatus.OK).json(result.attributes);
    }
    return res.status(HttpStatus.FORBIDDEN).json(result.attributes);
  }

  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FreeRADIUS authentication (internal)' })
  @ApiExcludeEndpoint()
  async authenticate(@Body() body: any, @Res() res: Response) {
    const result = await this.radiusService.authenticate(body);
    if (result.code === 200) {
      return res.status(HttpStatus.OK).json(result.attributes);
    }
    return res.status(HttpStatus.FORBIDDEN).json(result.attributes);
  }

  @Post('accounting')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'FreeRADIUS accounting (internal)' })
  @ApiExcludeEndpoint()
  async accounting(@Body() body: any, @Res() res: Response) {
    await this.radiusService.accounting(body);
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Post('post-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'FreeRADIUS post-auth (internal)' })
  @ApiExcludeEndpoint()
  async postAuth(@Body() body: any, @Res() res: Response) {
    await this.radiusService.postAuth(body);
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
