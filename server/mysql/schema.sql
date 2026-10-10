CREATE TABLE IF NOT EXISTS SUMI_migrations (
 version VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_companies (
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 name VARCHAR(255) NOT NULL, revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
 settings JSON NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_roles (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 name VARCHAR(255) NOT NULL, payload JSON NOT NULL,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,name),
 FOREIGN KEY(company_id) REFERENCES SUMI_companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_users (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 role_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 username VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL,
 password_hash VARCHAR(255) NULL, active BOOLEAN NOT NULL, payload JSON NOT NULL,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,username), UNIQUE(company_id,email),
 FOREIGN KEY(company_id,role_id) REFERENCES SUMI_roles(company_id,id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_contacts (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 rif VARCHAR(100) NOT NULL, name VARCHAR(255) NOT NULL, payload JSON NOT NULL,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,rif),
 FOREIGN KEY(company_id) REFERENCES SUMI_companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_products (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 sku VARCHAR(100) NOT NULL, name VARCHAR(255) NOT NULL,
 cost DECIMAL(20,2) NOT NULL, price DECIMAL(20,2) NOT NULL, minimum_qty DECIMAL(20,6) NOT NULL,
 payload JSON NOT NULL, PRIMARY KEY(company_id,id), UNIQUE(company_id,sku),
 FOREIGN KEY(company_id) REFERENCES SUMI_companies(id),
 CHECK(cost>=0 AND price>=0 AND minimum_qty>=0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_warehouses (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 name VARCHAR(255) NOT NULL, payload JSON NOT NULL,
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id) REFERENCES SUMI_companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_documents (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 contact_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 warehouse_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 source_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 number VARCHAR(100) NOT NULL, kind VARCHAR(50) NOT NULL, status VARCHAR(30) NOT NULL,
 currency CHAR(3) NOT NULL, total DECIMAL(20,2) NOT NULL, exchange_rate DECIMAL(20,8) NOT NULL,
 payload JSON NOT NULL, PRIMARY KEY(company_id,id), UNIQUE(company_id,number),
 FOREIGN KEY(company_id,contact_id) REFERENCES SUMI_contacts(company_id,id),
 FOREIGN KEY(company_id,warehouse_id) REFERENCES SUMI_warehouses(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES SUMI_documents(company_id,id),
 CHECK(total>=0 AND exchange_rate>=0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_document_lines (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 document_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 line_number INT UNSIGNED NOT NULL,
 product_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 qty DECIMAL(20,6) NOT NULL, price DECIMAL(20,2) NOT NULL,
 payload JSON NOT NULL, PRIMARY KEY(company_id,document_id,line_number),
 FOREIGN KEY(company_id,document_id) REFERENCES SUMI_documents(company_id,id),
 FOREIGN KEY(company_id,product_id) REFERENCES SUMI_products(company_id,id),
 CHECK(qty>0 AND price>=0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_movements (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 product_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 warehouse_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 document_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 qty DECIMAL(20,6) NOT NULL, payload JSON NOT NULL,
 PRIMARY KEY(company_id,id), INDEX(company_id,product_id,warehouse_id),
 FOREIGN KEY(company_id,product_id) REFERENCES SUMI_products(company_id,id),
 FOREIGN KEY(company_id,warehouse_id) REFERENCES SUMI_warehouses(company_id,id),
 FOREIGN KEY(company_id,document_id) REFERENCES SUMI_documents(company_id,id), CHECK(qty<>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_payments (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 document_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 amount DECIMAL(20,2) NOT NULL, payload JSON NOT NULL,
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,document_id) REFERENCES SUMI_documents(company_id,id), CHECK(amount>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_audit (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor VARCHAR(64) NOT NULL, action VARCHAR(80) NOT NULL, details JSON NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(company_id) REFERENCES SUMI_companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SUMI_idempotency (
 company_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 response JSON NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,request_key), FOREIGN KEY(company_id) REFERENCES SUMI_companies(id)
) ENGINE=InnoDB;
