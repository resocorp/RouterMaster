import { Module, Injectable, NotFoundException, Controller, Get, Post, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Invoice } from './entities/invoice.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class BillingService {
  constructor(@InjectRepository(Invoice) private readonly repo: Repository<Invoice>) {}

  async findAll(tenantId: string, page = 1, limit = 25): Promise<PaginatedResult<Invoice>> {
    const [data, total] = await this.repo.findAndCount({
      where: { tenantId }, order: { createdAt: 'DESC' },
      skip: (page - 1) * limit, take: limit,
    });
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string) {
    const inv = await this.repo.findOne({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async create(tenantId: string, dto: Partial<Invoice>) {
    return this.repo.save(this.repo.create({ ...dto, tenantId }));
  }

  async getSummary(tenantId: string, from?: string, to?: string) {
    const qb = this.repo.createQueryBuilder('i')
      .select('i.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(i.gross_price)', 'total')
      .where('i.tenant_id = :tenantId', { tenantId })
      .groupBy('i.type');
    if (from) qb.andWhere('i.created_at >= :from', { from });
    if (to) qb.andWhere('i.created_at <= :to', { to });
    return qb.getRawMany();
  }

  async generatePdf(id: string, tenantId: string): Promise<Buffer> {
    const invoice = await this.findOne(id, tenantId);
    const PDFDocument = require('pdfkit');
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber || invoice.id}`);
      doc.text(`Date: ${invoice.createdAt?.toISOString().split('T')[0]}`);
      doc.text(`Service: ${invoice.serviceName || 'N/A'}`);
      doc.text(`Type: ${invoice.type}`);
      doc.moveDown();
      doc.text(`Net Price: ${invoice.netPrice}`);
      doc.text(`VAT: ${invoice.vatAmount}`);
      doc.text(`Gross Price: ${invoice.grossPrice}`);
      doc.text(`Quantity: ${invoice.quantity}`);
      if (invoice.remark) doc.text(`Remark: ${invoice.remark}`);
      doc.end();
    });
  }
}

@ApiTags('billing') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin', 'manager')
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get('invoices') @Permissions('access_invoices') @ApiOperation({ summary: 'List invoices' })
  findAll(@TenantId() tid: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.service.findAll(tid, page || 1, limit || 25);
  }

  @Get('invoices/:id') @Permissions('access_invoices') @ApiOperation({ summary: 'Get invoice' })
  findOne(@Param('id') id: string, @TenantId() tid: string) { return this.service.findOne(id, tid); }

  @Post('invoices') @Permissions('billing') @ApiOperation({ summary: 'Create manual invoice' })
  create(@TenantId() tid: string, @Body() dto: any) { return this.service.create(tid, dto); }

  @Get('summary') @Permissions('billing') @ApiOperation({ summary: 'Revenue summary' })
  getSummary(@TenantId() tid: string, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getSummary(tid, from, to);
  }

  @Get('invoices/:id/pdf') @Permissions('access_invoices') @ApiOperation({ summary: 'Download invoice PDF' })
  async getPdf(@Param('id') id: string, @TenantId() tid: string, @Res() res: any) {
    const pdf = await this.service.generatePdf(id, tid);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=invoice-${id}.pdf` });
    res.send(pdf);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Invoice])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
