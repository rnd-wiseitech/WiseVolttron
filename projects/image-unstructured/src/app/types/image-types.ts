export type ViewType = 'list' | 'profile';
export type TransformType = 'label' | 'validate';
export type DrawType = 'none' | 'rectangle' | 'polygon' | 'keypoint';

export interface ImageData {
  type: TransformType;       // 'label' | 'validate'
  imageCount: number;        // 전체 이미지 수
  label: any[];// 과거 저장된 라벨 리스트(없으면 [])
  tagList: string[];         // 라벨 태그 목록(없으면 [])
  currentJobId: string;      // 작업/잡 아이디
  usetable: string;          // 테이블/뷰 이름 등
}