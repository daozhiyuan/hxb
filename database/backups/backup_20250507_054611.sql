-- MySQL dump 10.13  Distrib 8.0.42, for Linux (x86_64)
--
-- Host: localhost    Database: crm
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Appeal`
--

DROP TABLE IF EXISTS `Appeal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Appeal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customerName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idNumberHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `evidence` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','processing','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `partnerId` int NOT NULL,
  `operatorId` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `previousAppealId` int DEFAULT NULL,
  `remarks` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adminComment` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Appeal_idNumberHash_key` (`idNumberHash`),
  KEY `Appeal_status_idx` (`status`),
  KEY `Appeal_partnerId_idx` (`partnerId`),
  KEY `Appeal_operatorId_idx` (`operatorId`),
  KEY `Appeal_previousAppealId_idx` (`previousAppealId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Appeal`
--

LOCK TABLES `Appeal` WRITE;
/*!40000 ALTER TABLE `Appeal` DISABLE KEYS */;
INSERT INTO `Appeal` VALUES (1,'ok','132628197704015211','30c62bf32ddd29fb56000655fff08a62503f0e8e617c36e02181d3af0367361a','乐山大佛；附件；多少；啊富凯大厦；返','/uploads/e678b083-32fd-4525-bf64-f251017a0aa4.pdf','pending',3,1,'2025-05-07 05:15:29.001','2025-05-07 05:40:09.602',NULL,'待处理',NULL);
/*!40000 ALTER TABLE `Appeal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AppealLog`
--

DROP TABLE IF EXISTS `AppealLog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AppealLog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `appealId` int NOT NULL,
  `action` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operatorId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AppealLog_appealId_idx` (`appealId`),
  KEY `AppealLog_operatorId_idx` (`operatorId`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AppealLog`
--

LOCK TABLES `AppealLog` WRITE;
/*!40000 ALTER TABLE `AppealLog` DISABLE KEYS */;
INSERT INTO `AppealLog` VALUES (1,1,'CREATE','创建申诉',3,'2025-05-07 05:15:29.008'),(2,1,'STATUS_UPDATE','状态更新: PROCESSING - 处理中请稍候，根据协调时间尽快处理',1,'2025-05-07 05:33:31.187'),(3,1,'STATUS_UPDATE','状态更新: PROCESSING - 正在处理',1,'2025-05-07 05:34:03.045'),(4,1,'STATUS_UPDATE','状态更新: PENDING - 待处理',1,'2025-05-07 05:36:11.988'),(5,1,'STATUS_UPDATE','状态更新: PROCESSING - 处理中',1,'2025-05-07 05:36:30.998'),(6,1,'STATUS_UPDATE','状态更新: PROCESSING - 处理中',1,'2025-05-07 05:37:11.226'),(7,1,'STATUS_UPDATE','状态更新: PROCESSING - 处理中',1,'2025-05-07 05:38:09.827'),(8,1,'STATUS_UPDATE','状态更新: PROCESSING - 处理中',1,'2025-05-07 05:39:05.522'),(9,1,'STATUS_UPDATE','状态更新: PROCESSING - 处理中',1,'2025-05-07 05:39:52.619'),(10,1,'STATUS_UPDATE','状态更新: PENDING - 待处理',1,'2025-05-07 05:40:09.610');
/*!40000 ALTER TABLE `AppealLog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FollowUp`
--

DROP TABLE IF EXISTS `FollowUp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FollowUp` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `customerId` int NOT NULL,
  `createdById` int NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEETING',
  `attachments` json DEFAULT NULL,
  `duration` int DEFAULT '30',
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nextSteps` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `outcome` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `participants` json DEFAULT NULL,
  `sentiment` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FollowUp_customerId_idx` (`customerId`),
  KEY `FollowUp_createdById_idx` (`createdById`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FollowUp`
--

LOCK TABLES `FollowUp` WRITE;
/*!40000 ALTER TABLE `FollowUp` DISABLE KEYS */;
INSERT INTO `FollowUp` VALUES (1,'继续跟进','2025-05-07 05:09:25.000',1,1,'MEETING',NULL,30,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `FollowUp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_CustomerToCustomerTag`
--

DROP TABLE IF EXISTS `_CustomerToCustomerTag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_CustomerToCustomerTag` (
  `A` int NOT NULL,
  `B` int NOT NULL,
  UNIQUE KEY `_CustomerToCustomerTag_AB_unique` (`A`,`B`),
  KEY `_CustomerToCustomerTag_B_index` (`B`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_CustomerToCustomerTag`
--

LOCK TABLES `_CustomerToCustomerTag` WRITE;
/*!40000 ALTER TABLE `_CustomerToCustomerTag` DISABLE KEYS */;
/*!40000 ALTER TABLE `_CustomerToCustomerTag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('33125eeb-aaab-43cb-9e87-c163c39672aa','43a53230a711d14a1d4772a59574055b9632439da83b266eb7513a70b2bacbda','2025-05-07 05:06:46.360','20250507050646_add_previous_appeal_id',NULL,NULL,'2025-05-07 05:06:46.239',1),('62bea6b3-cd81-47a5-bf32-fe37295cb2a7','c69c7bb262f4c286551f9892d00d926c5e46afc9ad66121acd72416064b7f3e0','2025-05-07 05:06:33.003','20250430142657_update_crm_schema',NULL,NULL,'2025-05-07 05:06:32.934',1),('9ba9c12e-c919-4008-8d35-4f994cd1a376','ecd5f2098c290287320b2dc9dcd677130eeb5483f4085dcb50feff9e7f41d3b6','2025-05-07 05:06:32.932','20250430124717_add_admin_comment',NULL,NULL,'2025-05-07 05:06:32.908',1),('9bd8dfc5-2267-41b4-be27-95d752b93b57','33736f059c9fc699f46a24c75468771b3a9250ef96bab7f7e30a26915de60d92','2025-05-07 05:11:49.067','20250507051148_add_appeal_remarks',NULL,NULL,'2025-05-07 05:11:49.040',1),('b2c81a23-8449-4afc-9383-b667ab862372','6bcf0fd0eb0aa0e4e7e9afc0f1db3c6c4b095cd2d5b65fe6db4d71d3a074dbbc','2025-05-07 05:06:33.034','20250505150047_update_customer_table',NULL,NULL,'2025-05-07 05:06:33.004',1),('fb10d5a2-e41b-424d-ba6c-f5a2f30c066e','ecd5f2098c290287320b2dc9dcd677130eeb5483f4085dcb50feff9e7f41d3b6','2025-05-07 05:13:09.306','20250507051308_add_admin_comment',NULL,NULL,'2025-05-07 05:13:09.258',1),('fea3e249-dfce-45fb-9dc3-aca1fd63e1e7','50f4364f03fb2498b2435a96536e58a5615d8db31d335759656c1bee11051977','2025-05-07 05:06:32.906','20250430054603_init',NULL,NULL,'2025-05-07 05:06:32.822',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_tags`
--

DROP TABLE IF EXISTS `customer_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_tags`
--

LOCK TABLES `customer_tags` WRITE;
/*!40000 ALTER TABLE `customer_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `companyName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('FOLLOWING','NEGOTIATING','PENDING','SIGNED','COMPLETED','LOST') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registrationDate` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `jobTitle` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registeredByPartnerId` int NOT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idCardHash` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idCardNumberEncrypted` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastYearRevenue` double DEFAULT NULL,
  `followUpStatus` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastContactedAt` datetime(3) DEFAULT NULL,
  `lastFollowUpAt` datetime(3) DEFAULT NULL,
  `logs` json DEFAULT NULL,
  `nextFollowUpAt` datetime(3) DEFAULT NULL,
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_idCardHash_key` (`idCardHash`),
  KEY `customers_registeredByPartnerId_idx` (`registeredByPartnerId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'OK',NULL,'18818881888',NULL,'NEGOTIATING',NULL,'2025-05-07 05:07:56.035','2025-05-07 05:07:56.035',NULL,2,'水岸东方','30c62bf32ddd29fb56000655fff08a62503f0e8e617c36e02181d3af0367361a','OnPVN6iDDGj9Pk0yTpDWamBrSNWm2QpgbOSx1fAOtjnYMAR+95P+aIFv5TjAjA==',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('SUPER_ADMIN','ADMIN','PARTNER','USER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  KEY `users_email_idx` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'系统管理员','admin@example.com','$2b$12$3bhQqHNqQe6EJ47s4rhBeurP4zFPPV2aDQe/x/ukFnfKWb9MonpUO','ADMIN',1,'2025-05-07 05:06:35.412','2025-05-07 05:06:35.412'),(2,'测试合作伙伴','partner@example.com','$2b$12$zeTrDckomSn1l76qZbitxeQUv8WWnNrdTpSkEFFfN5fgH6m0txk5G','PARTNER',1,'2025-05-07 05:06:36.006','2025-05-07 05:06:36.006'),(3,'fan','way@mail.ndrc.org.cn','$2b$12$kvDHx5p4Qt9ok8vlDZqG/ubNDYb6XTErCZTVxGdZn6/bdJDfy6zhe','PARTNER',1,'2025-05-07 05:08:28.497','2025-05-07 05:09:58.168');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-07  5:46:11
