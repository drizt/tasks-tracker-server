-- CreateTable
CREATE TABLE `TaskStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    UNIQUE INDEX `TaskStatus_name_key` (`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- InsertInto
INSERT INTO
`TaskStatus` (`name`)
VALUES ('new'),
('active'),
('completed'),
('deferred'),
('canceled');

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `statusId` INTEGER NOT NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT FALSE,
    `archivedAt` DATETIME(3) NULL,
    INDEX `Task_createdAt_idx` (`createdAt`),
    INDEX `Task_updatedAt_idx` (`updatedAt`),
    INDEX `Task_title_idx` (`title`),
    INDEX `Task_statusId_idx` (`statusId`),
    INDEX `Task_isArchived_idx` (`isArchived`),
    INDEX `Task_archivedAt_idx` (`archivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeEntry` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `note` TEXT NOT NULL,
    INDEX `TimeEntry_taskId_idx` (`taskId`),
    INDEX `TimeEntry_startedAt_idx` (`startedAt`),
    INDEX `TimeEntry_endedAt_idx` (`endedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Task`
ADD CONSTRAINT `Task_statusId_fkey` FOREIGN KEY (
    `statusId`
) REFERENCES `TaskStatus` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeEntry`
ADD CONSTRAINT `TimeEntry_taskId_fkey` FOREIGN KEY (
    `taskId`
) REFERENCES `Task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
