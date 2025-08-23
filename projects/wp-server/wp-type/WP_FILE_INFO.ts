export interface WpFile {
    link: string;
    fileName: string;
}

export interface WP_FILE_SYSTEM_ATT {
    accessTime?: number;
    blockSize?: number;
    childrenNum?: number;
    fileId?: number;
    group?: string;
    length?: number;
    modificationTime?: number;
    owner?: string;
    pathSuffix?: string;
    name?: string;
    permission?: string;
    replication?: number;
    storagePolicy?: number;
    type: string;
}