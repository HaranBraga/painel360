"use client";

export interface PersonRole {
  id: string;
  key: string;
  label: string;
  color: string;
  bgColor: string;
  level: number;
}

export function RoleBadge({ role }: { role: PersonRole }) {
  return (
    <span
      className="role-badge"
      style={{ color: role.color, backgroundColor: role.bgColor }}
    >
      {role.label}
    </span>
  );
}
