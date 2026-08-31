const ARCHIVE_FOLDER_NAME = 'keijiban-attachments';

const getOrCreateArchiveFolder = () => {
  const iter = DriveApp.getFoldersByName(ARCHIVE_FOLDER_NAME);
  return iter.hasNext() ? iter.next() : DriveApp.createFolder(ARCHIVE_FOLDER_NAME);
};

const archiveFile = (file) => {
  const driveFile = getOrCreateArchiveFolder()
    .createFile(file.copyBlob())
    .setName(file.getName());
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return driveFile.getUrl();
};

