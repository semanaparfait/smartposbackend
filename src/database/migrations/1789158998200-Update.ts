import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1789158998200 implements MigrationInterface {
    name = 'Update1789158998200'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "device_id" character varying NOT NULL, "device_name" character varying NOT NULL, "device_os" character varying NOT NULL, "registration_status" "public"."devices_registration_status_enum" NOT NULL DEFAULT 'PENDING', "company_id" uuid, CONSTRAINT "UQ_2667f40edb344d6f274a0d42b6f" UNIQUE ("device_id"), CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employee_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "description" character varying, "company_id" uuid, CONSTRAINT "PK_71ecf0ea3041c35322b4a1b86b3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "buying_price" numeric NOT NULL, "selling_price" numeric NOT NULL, "bar_code" character varying, "ingredients" text, "active" boolean NOT NULL DEFAULT true, "category_id" uuid, CONSTRAINT "UQ_4c9fb58de893725258746385e16" UNIQUE ("name"), CONSTRAINT "UQ_85bc6c26c940e2b0201b4442034" UNIQUE ("bar_code"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, CONSTRAINT "UQ_a75bfadcd8291a0538ab7abfdcf" UNIQUE ("name"), CONSTRAINT "PK_7069dac60d88408eca56fdc9e0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "url" character varying NOT NULL, "type" "public"."files_type_enum" NOT NULL, "mime_type" character varying NOT NULL, "size" integer NOT NULL, "product_id" uuid, "category_id" uuid, "employee_id" uuid, CONSTRAINT "REL_6ca4ba01b61dc707723663a7b2" UNIQUE ("category_id"), CONSTRAINT "REL_e4bbac3c88a28f06743194174a" UNIQUE ("employee_id"), CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "email" character varying, "phone" character varying, "salary" integer NOT NULL, "shift" "public"."employees_shift_enum" NOT NULL, "role_id" uuid, "company_id" uuid, CONSTRAINT "UQ_EMPLOYEE_COMPANY_PHONE" UNIQUE ("company_id", "phone"), CONSTRAINT "UQ_EMPLOYEE_COMPANY_EMAIL" UNIQUE ("company_id", "email"), CONSTRAINT "CHK_1f8b184d0a5e14c7e4c7b86880" CHECK (("email" IS NOT NULL OR "phone" IS NOT NULL)), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "seats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "xCoordinate" integer NOT NULL, "yCoordinate" integer NOT NULL, "status" "public"."seats_status_enum" NOT NULL, "room_id" uuid, CONSTRAINT "PK_3fbc74bb4638600c506dcb777a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "room_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, CONSTRAINT "PK_b6e1d0a9b67d4b9fbff9c35ab69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "status" "public"."rooms_status_enum" NOT NULL, "floor_map_id" uuid, "room_type_id" uuid, CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "floor_maps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "company_id" uuid, CONSTRAINT "PK_16c10677177e8bcde5cf5482747" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying NOT NULL, "logo" character varying, "name" character varying NOT NULL, "email" character varying NOT NULL, "phone_number" character varying NOT NULL, "location" character varying NOT NULL, "type" "public"."companies_type_enum" NOT NULL, CONSTRAINT "UQ_80af3e6808151c3210b4d5a2185" UNIQUE ("code"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "email" character varying, "phone" character varying, "pin" character varying, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "active" boolean NOT NULL DEFAULT true, "mustChangePassword" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, "employee_id" uuid, "company_id" uuid, CONSTRAINT "UQ_USER_COMPANY_PHONE" UNIQUE ("company_id", "phone"), CONSTRAINT "UQ_USER_COMPANY_EMAIL" UNIQUE ("company_id", "email"), CONSTRAINT "REL_9760615d88ed518196bb79ea03" UNIQUE ("employee_id"), CONSTRAINT "CHK_af5344075f113492cf1e52017f" CHECK (("email" IS NOT NULL OR "phone" IS NOT NULL)), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."orders_status_enum" NOT NULL, "subtotal" numeric NOT NULL, "tax" numeric NOT NULL, "total" numeric NOT NULL, "note" character varying, "user_id" uuid, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "quantity" integer NOT NULL, "total_price" numeric NOT NULL, "product_id" uuid, "cart_id" uuid, "order_id" uuid, CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "carts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."carts_status_enum" NOT NULL, "total_amount" numeric NOT NULL DEFAULT '0', "seat_id" uuid, CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_7ecad136057bde38d4a0bdd45e9" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_roles" ADD CONSTRAINT "FK_80ab28850f3cff89afc651a42dd" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_e15089eb0cc4f275cf80636be6a" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_6ca4ba01b61dc707723663a7b25" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_e4bbac3c88a28f06743194174ae" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_727d9c30d77d3a253177b2e918f" FOREIGN KEY ("role_id") REFERENCES "employee_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_7f3eeef59eece4147effe7bfa6a" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "seats" ADD CONSTRAINT "FK_657a29871b8dd6a5107da320458" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_ff815347361fc36c342539efa8b" FOREIGN KEY ("floor_map_id") REFERENCES "floor_maps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_8a380bdc519b8701daf0ec62da0" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "floor_maps" ADD CONSTRAINT "FK_c0f8a0913bc0dfc0e8291ef29fe" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_9760615d88ed518196bb79ea03d" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_7ae6334059289559722437bcc1c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items" ADD CONSTRAINT "FK_fb0b5b8bc408db666a8bf407661" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items" ADD CONSTRAINT "FK_e18e87dca227ffef10b99c8dae3" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items" ADD CONSTRAINT "FK_f3dcaa16e13ff84a647c6410e15" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carts" ADD CONSTRAINT "FK_7997348b4d1c76342ee26941c47" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" DROP CONSTRAINT "FK_7997348b4d1c76342ee26941c47"`);
        await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_f3dcaa16e13ff84a647c6410e15"`);
        await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_e18e87dca227ffef10b99c8dae3"`);
        await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_fb0b5b8bc408db666a8bf407661"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_7ae6334059289559722437bcc1c"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_9760615d88ed518196bb79ea03d"`);
        await queryRunner.query(`ALTER TABLE "floor_maps" DROP CONSTRAINT "FK_c0f8a0913bc0dfc0e8291ef29fe"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_8a380bdc519b8701daf0ec62da0"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_ff815347361fc36c342539efa8b"`);
        await queryRunner.query(`ALTER TABLE "seats" DROP CONSTRAINT "FK_657a29871b8dd6a5107da320458"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_7f3eeef59eece4147effe7bfa6a"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_727d9c30d77d3a253177b2e918f"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_e4bbac3c88a28f06743194174ae"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_6ca4ba01b61dc707723663a7b25"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_e15089eb0cc4f275cf80636be6a"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`);
        await queryRunner.query(`ALTER TABLE "employee_roles" DROP CONSTRAINT "FK_80ab28850f3cff89afc651a42dd"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_7ecad136057bde38d4a0bdd45e9"`);
        await queryRunner.query(`DROP TABLE "carts"`);
        await queryRunner.query(`DROP TABLE "items"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "companies"`);
        await queryRunner.query(`DROP TABLE "floor_maps"`);
        await queryRunner.query(`DROP TABLE "rooms"`);
        await queryRunner.query(`DROP TABLE "room_types"`);
        await queryRunner.query(`DROP TABLE "seats"`);
        await queryRunner.query(`DROP TABLE "employees"`);
        await queryRunner.query(`DROP TABLE "files"`);
        await queryRunner.query(`DROP TABLE "product_categories"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "employee_roles"`);
        await queryRunner.query(`DROP TABLE "devices"`);
    }

}
