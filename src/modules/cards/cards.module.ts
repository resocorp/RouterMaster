import { Module, Injectable, NotFoundException, BadRequestException, Controller, Get, Post, Body, Param, Query, UseGuards, Res, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CardSeries } from './entities/card-series.entity';
import { Card } from './entities/card.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import * as crypto from 'crypto';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    @InjectRepository(CardSeries) private readonly seriesRepo: Repository<CardSeries>,
    @InjectRepository(Card) private readonly cardRepo: Repository<Card>,
    @InjectRepository(Subscriber) private readonly subRepo: Repository<Subscriber>,
    private readonly dataSource: DataSource,
  ) {}

  async listSeries(tenantId: string) {
    return this.seriesRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async getSeries(id: string, tenantId: string) {
    const s = await this.seriesRepo.findOne({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Card series not found');
    return s;
  }

  async createSeries(tenantId: string, dto: Partial<CardSeries>) {
    const series = this.seriesRepo.create({ ...dto, tenantId });
    const saved = await this.seriesRepo.save(series);

    const cards: Partial<Card>[] = [];
    for (let i = 0; i < (dto.quantity || 0); i++) {
      cards.push({
        seriesId: saved.id,
        tenantId,
        pin: (dto.prefix || '') + crypto.randomBytes(Math.ceil((dto.pinLength || 8) / 2)).toString('hex').substring(0, dto.pinLength || 8).toUpperCase(),
        password: crypto.randomBytes(Math.ceil((dto.passwordLength || 6) / 2)).toString('hex').substring(0, dto.passwordLength || 6),
        status: 'active',
      });
    }

    if (cards.length > 0) {
      await this.cardRepo.createQueryBuilder().insert().into(Card).values(cards as any[]).execute();
    }

    this.logger.log(`Created card series ${saved.id} with ${cards.length} cards`);
    return { series: saved, cardsGenerated: cards.length };
  }

  async listCards(seriesId: string, tenantId: string, page = 1, limit = 50) {
    const [data, total] = await this.cardRepo.findAndCount({
      where: { seriesId, tenantId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit, take: limit,
    });
    return { data, total, page, limit };
  }

  async activateCard(pin: string, username: string, tenantId: string) {
    const card = await this.cardRepo.findOne({ where: { pin, tenantId, status: 'active' } });
    if (!card) throw new NotFoundException('Card not found or already used');

    const series = await this.seriesRepo.findOne({ where: { id: card.seriesId } });
    if (!series) throw new NotFoundException('Card series not found');

    if (series.validTill && new Date(series.validTill) < new Date()) {
      throw new BadRequestException('Card has expired');
    }

    const subscriber = await this.subRepo.findOne({ where: { username, tenantId } });
    if (!subscriber) throw new NotFoundException('Subscriber not found');

    card.status = 'used';
    card.activatedBy = subscriber.id;
    card.activatedAt = new Date();
    await this.cardRepo.save(card);

    this.logger.log(`Card ${pin} activated by ${username}`);
    return { success: true, message: 'Card activated successfully' };
  }

  async revokeCards(seriesId: string, tenantId: string) {
    await this.cardRepo.update({ seriesId, tenantId, status: 'active' }, { status: 'revoked' });
    return { success: true };
  }

  async exportCsv(seriesId: string, tenantId: string): Promise<string> {
    const cards = await this.cardRepo.find({ where: { seriesId, tenantId }, order: { createdAt: 'ASC' } });
    let csv = 'PIN,Password,Status,Created\n';
    for (const c of cards) {
      csv += `${c.pin},${c.password || ''},${c.status},${c.createdAt?.toISOString()}\n`;
    }
    return csv;
  }
}

@ApiTags('cards') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin', 'manager')
@Controller('cards')
export class CardsController {
  constructor(private readonly service: CardsService) {}

  @Get('series') @Permissions('list_cards') @ApiOperation({ summary: 'List card series' })
  listSeries(@TenantId() tid: string) { return this.service.listSeries(tid); }

  @Post('series') @Permissions('register_cards') @ApiOperation({ summary: 'Create card series + generate cards' })
  createSeries(@TenantId() tid: string, @Body() dto: any) { return this.service.createSeries(tid, dto); }

  @Get('series/:id') @Permissions('list_cards') @ApiOperation({ summary: 'Get card series' })
  getSeries(@Param('id') id: string, @TenantId() tid: string) { return this.service.getSeries(id, tid); }

  @Get('series/:id/cards') @Permissions('list_cards') @ApiOperation({ summary: 'List cards in series' })
  listCards(@Param('id') id: string, @TenantId() tid: string, @Query('page') p: number, @Query('limit') l: number) {
    return this.service.listCards(id, tid, p || 1, l || 50);
  }

  @Post('activate') @Permissions('activate_cards') @ApiOperation({ summary: 'Activate a card' })
  activate(@TenantId() tid: string, @Body() body: { pin: string; username: string }) {
    return this.service.activateCard(body.pin, body.username, tid);
  }

  @Post('series/:id/revoke') @Permissions('delete_cards') @ApiOperation({ summary: 'Revoke all active cards in series' })
  revoke(@Param('id') id: string, @TenantId() tid: string) { return this.service.revokeCards(id, tid); }

  @Get('series/:id/export') @Permissions('list_cards') @ApiOperation({ summary: 'Export cards as CSV' })
  async exportCsv(@Param('id') id: string, @TenantId() tid: string, @Res() res: any) {
    const csv = await this.service.exportCsv(id, tid);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename=cards-${id}.csv` });
    res.send(csv);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([CardSeries, Card, Subscriber])],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
