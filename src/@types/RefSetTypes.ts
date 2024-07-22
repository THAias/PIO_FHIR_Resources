export interface RefSetReferencedComponent {
    conceptId: string;
    active: boolean;
    definitionStatus: string;
    moduleId: string;
    fsn: {
        term: string;
        lang: string;
    };
    pt: {
        term: string;
        lang: string;
    };
    id: string;
}

export interface RefSetItem {
    active: boolean;
    moduleId: string;
    released: boolean;
    releasedEffectiveTime: number;
    memberId: string;
    refsetId: string;
    referencedComponentId: string;
    additionalFields: Record<string, unknown>;
    referencedComponent: RefSetReferencedComponent;
    effectiveTime: string;
}

export interface RefSet {
    items: RefSetItem[];
    total: number;
    limit: number;
    offset: number;
    searchAfter: string;
    searchAfterArray: string[];
}
