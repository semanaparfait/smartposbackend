import { MigrationInterface, QueryRunner } from 'typeorm';

// Existing uploads were stored with http links and mime_type 'upload' (Cloudinary's
// delivery type, not the image type).
export class FileUrlsHttps1793150000000 implements MigrationInterface {
  name = 'FileUrlsHttps1793150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "files" SET "url" = 'https://' || substring("url" from 8) WHERE "url" LIKE 'http://%'`,
    );
    await queryRunner.query(
      `UPDATE "files" SET "mime_type" = CASE lower(substring("url" from '\\.([A-Za-z0-9]+)$'))
         WHEN 'jpg' THEN 'image/jpeg' WHEN 'jpeg' THEN 'image/jpeg' WHEN 'png' THEN 'image/png'
         WHEN 'webp' THEN 'image/webp' WHEN 'gif' THEN 'image/gif' ELSE 'image/jpeg' END
       WHERE "mime_type" = 'upload'`,
    );
  }

  public async down(): Promise<void> {
    // Data fix only; https links and real mime types stay valid.
  }
}
