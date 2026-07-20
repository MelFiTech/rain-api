import { Injectable } from '@nestjs/common';
import { generateId } from '../../common/utils/ids';
import type { NotificationEntity } from '../../domain/types';
import {
  InstitutionRepository,
  NotificationRepository,
} from '../../persistence';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly institutions: InstitutionRepository,
  ) {}

  async list(institutionId: string): Promise<NotificationEntity[]> {
    return this.notifications.listForInstitution(institutionId);
  }

  async add(
    institutionId: string,
    title: string,
    message: string,
  ): Promise<NotificationEntity> {
    const institution = await this.institutions.findById(institutionId);
    const prefs = institution?.notificationPreferences;
    if (prefs && !prefs.inAppNotifications) {
      return {
        id: generateId('ntf'),
        institutionId,
        title,
        message,
        read: true,
        createdAt: new Date().toISOString(),
      };
    }

    const item: NotificationEntity = {
      id: generateId('ntf'),
      institutionId,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await this.notifications.save(item);
    return item;
  }

  async markRead(institutionId: string, id: string): Promise<boolean> {
    const item = await this.notifications.findById(id);
    if (!item || item.institutionId !== institutionId) return false;
    item.read = true;
    await this.notifications.save(item);
    return true;
  }
}
