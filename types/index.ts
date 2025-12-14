export interface Paper {
    paperId: string;
    title: string;
    abstract: string | null;
    url?: string;
    year?: number;
    publicationDate?: string;
    authors: { name: string }[];
    venue: string;
    country?: string;
}

export interface SearchResponse {
    data: Paper[];
    total: number;
}

export type SummaryStyle = 'abstract' | 'blog' | 'youtube' | 'review' | 'overview' | 'article' | 'detail';
