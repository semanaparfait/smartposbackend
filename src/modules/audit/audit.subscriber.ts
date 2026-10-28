import {
  EntityMetadata,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { AuditActor } from 'src/common/entities/base.entity';
import { RequestContext } from 'src/common/context/request-context';
import { AuditAction, AuditLog } from './entities/audit-log.entity';

// Tables that are themselves logs (or high-frequency tracking) and must not be audited.
const SKIPPED_TABLES = new Set(['audit_logs', 'device_activities']);

// Never write these values into the history.
const SECRET_FIELDS = new Set(['password', 'pin', 'secretHash']);

// Bookkeeping fields that change on every update and carry no information of their own.
const IGNORED_FIELDS = new Set(['updatedAt', 'updatedBy', 'createdBy']);

// Stamps createdBy/updatedBy on every entity and records every create/update/delete
// in audit_logs, using the user from the current RequestContext.
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>) {
    if (!this.isAudited(event.metadata) || !event.entity) return;

    const actor = this.actor();
    if (!this.hasColumn(event.metadata, 'createdBy')) return;

    event.entity.createdBy ??= actor;
    event.entity.updatedBy ??= actor;
  }

  beforeUpdate(event: UpdateEvent<any>) {
    if (!this.isAudited(event.metadata) || !event.entity) return;
    if (!this.hasColumn(event.metadata, 'updatedBy')) return;

    event.entity.updatedBy = this.actor();
  }

  async afterInsert(event: InsertEvent<any>) {
    if (!this.isAudited(event.metadata) || !event.entity) return;

    const id = event.metadata.getEntityIdMixedMap(event.entity);

    await this.write(event, AuditAction.CREATE, this.idOf(id), {
      changes: this.snapshot(event.metadata, event.entity),
      entity: event.entity,
    });
  }

  async afterUpdate(event: UpdateEvent<any>) {
    if (!this.isAudited(event.metadata) || !event.entity) return;

    const changes: Record<string, { from: any; to: any }> = {};
    const before = event.databaseEntity;

    if (before) {
      for (const column of event.updatedColumns) {
        if (IGNORED_FIELDS.has(column.propertyName)) continue;

        // Secrets are never loaded, so only record that they changed.
        if (SECRET_FIELDS.has(column.propertyName)) {
          changes[column.propertyName] = { from: '***', to: '***' };
          continue;
        }

        changes[column.propertyName] = {
          from: this.mask(column.propertyName, column.getEntityValue(before)),
          to: this.mask(
            column.propertyName,
            column.getEntityValue(event.entity),
          ),
        };
      }

      for (const relation of event.updatedRelations) {
        const name = relation.propertyName;
        changes[name] = {
          from: before[name]?.id ?? before[name] ?? null,
          to: event.entity[name]?.id ?? event.entity[name] ?? null,
        };
      }
    } else {
      // QueryBuilder updates only know the values being set.
      for (const [key, value] of Object.entries(event.entity)) {
        if (IGNORED_FIELDS.has(key)) continue;
        changes[key] = { from: undefined, to: this.mask(key, value) };
      }
    }

    if (Object.keys(changes).length === 0) return;

    const id =
      (before && event.metadata.getEntityIdMixedMap(before)) ??
      event.metadata.getEntityIdMixedMap(event.entity);

    await this.write(event, AuditAction.UPDATE, this.idOf(id), {
      changes,
      entity: { ...before, ...event.entity },
    });
  }

  async afterRemove(event: RemoveEvent<any>) {
    if (!this.isAudited(event.metadata)) return;

    // databaseEntity has the stored columns, entity has the loaded relations (e.g. company).
    const record = { ...event.databaseEntity, ...event.entity };
    const id = event.entityId ?? event.databaseEntity?.id;

    if (!id) return;

    await this.write(event, AuditAction.DELETE, this.idOf(id), {
      changes: event.databaseEntity
        ? this.snapshot(event.metadata, event.databaseEntity)
        : null,
      entity: record,
    });
  }

  // helpers

  private async write(
    event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>,
    action: AuditAction,
    entityId: string | null,
    data: { changes: Record<string, any> | null; entity: any },
  ) {
    const actor = this.actor();

    await event.manager.getRepository(AuditLog).insert({
      action,
      entityName: event.metadata.tableName,
      entityId,
      changes: data.changes,
      actor,
      actorId: actor?.id ?? null,
      companyId: this.companyOf(event.metadata, data.entity, entityId),
    });
  }

  private actor(): AuditActor | null {
    const actor = RequestContext.actor();
    if (!actor) return null;

    return {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    };
  }

  // The company a record belongs to, so owners can see their own company's history.
  private companyOf(
    metadata: EntityMetadata,
    entity: any,
    entityId: string | null,
  ) {
    if (metadata.tableName === 'companies') return entityId;

    // Records without a direct company reach it through their parent.
    const company =
      entity?.company ??
      entity?.floorMap?.company ??
      entity?.room?.floorMap?.company ??
      entity?.cart?.company ??
      entity?.order?.company ??
      entity?.product?.company ??
      entity?.employee?.company;
    const id = typeof company === 'string' ? company : company?.id;

    return id ?? RequestContext.actor()?.companyId ?? null;
  }

  private snapshot(metadata: EntityMetadata, entity: any) {
    const result: Record<string, any> = {};

    for (const column of metadata.columns) {
      const value = column.getEntityValue(entity);
      if (value === undefined) continue;
      result[column.propertyName] = this.mask(column.propertyName, value);
    }

    return result;
  }

  private mask(field: string, value: any) {
    return SECRET_FIELDS.has(field) && value != null ? '***' : value;
  }

  private idOf(id: any): string | null {
    if (id == null) return null;
    return typeof id === 'object' ? (id.id ?? JSON.stringify(id)) : String(id);
  }

  private isAudited(metadata: EntityMetadata) {
    return !SKIPPED_TABLES.has(metadata.tableName);
  }

  private hasColumn(metadata: EntityMetadata, property: string) {
    return metadata.columns.some((c) => c.propertyName === property);
  }
}
