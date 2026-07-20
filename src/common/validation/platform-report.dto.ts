import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { ReportCategory } from '../../domain/types';

const REPORT_CATEGORIES = [
  'fraud',
  'scam',
  'mule_account',
  'identity_theft',
  'chargeback_abuse',
  'loan_fraud',
  'suspicious_transaction',
  'other',
] as const satisfies readonly ReportCategory[];

export class SubmitPlatformReportDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value != null && String(value).trim() !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  bvn?: string;

  @IsOptional()
  @IsString()
  nin?: string;

  @IsEnum(REPORT_CATEGORIES)
  category!: ReportCategory;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsDateString()
  incidentDate!: string;

  @IsOptional()
  @IsNumber()
  amountInvolved?: number;
}
