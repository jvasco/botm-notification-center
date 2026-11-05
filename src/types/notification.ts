export type NotificationType = "FILTER" | "CSV" | "EVENT";

export interface NotificationDefinition {
    id: number;
    name: string;
    type: NotificationType;
    isActive: boolean;
    filters: NotificationFilter[];
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationFilter {
    id: number;
    type: string;
    value: string;
}