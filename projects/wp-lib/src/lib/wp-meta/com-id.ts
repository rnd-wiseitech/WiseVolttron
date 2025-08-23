/*
    - 역할
        COM_ID 동적 할당 및 사용 관련 모듈
        COM_ID? 컴포넌트 TYPE - ID 매핑하는 enum 인스턴스

    - DB
        COM_MSTR의 ID, TYPE 칼럼

    - 사용
        workflow와 wp-server에서
        "import COM_ID" 또는 "import getCOM_ID"
        COM_ID["컴포넌트 이름"] 방식으로 사용
*/

// 컴포넌트 "CATEGOTY - ID List" 매핑
let COM_ID_CATEGORY: Record<string, number[]> = {};

// 외부 호출: 컴포넌트 "TYPE - ID" 매핑
export let COM_ID: Record<string, number> = {};
export function getCOM_ID(): Record<string, number> {
    return COM_ID;
}

// 초기화: workflow/app.component.ts, wp-server/index.ts에서만 사용
export function setCOM_ID(pComType: string, pComId: number, pCategory: string) {
    // TYPE과 ID 1대1 매핑
    COM_ID[pComType] = pComId;

    // 카테고리별 COM_ID 리스트
    if (!COM_ID_CATEGORY[pCategory]) COM_ID_CATEGORY[pCategory] = [];
    COM_ID_CATEGORY[pCategory].push(pComId);
}

// 특정 문자열('A-', 'T-' 등)로 시작하는 TYPE을 COM_ID에서 찾아 ID 리스트로 반환
export function getCOM_IDListByPrefix(pComPrefix: string): number[] {
    return Object.entries(COM_ID)
        .filter(([key, _]) => key.startsWith(pComPrefix))
        .map(([_, id]) => id);
}

// 특정 카테고리에 해당하는 ID를 검색
export function getCOM_IDListByCategory(...pCategory: string[]): number[] {
    let sTempID: number[] = [];

    pCategory.forEach(c => {
        sTempID = sTempID.concat(COM_ID_CATEGORY[c] || []);
    })
    return sTempID;
}
