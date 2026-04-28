const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { id: "role-coordenador-grupo", key: "COORDENADOR_GRUPO", label: "Coordenador de Grupo", color: "#7c3aed", bgColor: "#ede9fe", level: 0 },
  { id: "role-coordenador",       key: "COORDENADOR",       label: "Coordenador",          color: "#1d4ed8", bgColor: "#dbeafe", level: 1 },
  { id: "role-lider",             key: "LIDER",             label: "Líder",                color: "#b45309", bgColor: "#fef3c7", level: 2 },
  { id: "role-apoiador",          key: "APOIADOR",          label: "Apoiador",             color: "#15803d", bgColor: "#dcfce7", level: 3 },
];

async function main() {
  const count = await prisma.personRole.count();
  if (count === 0) {
    for (const role of DEFAULT_ROLES) {
      await prisma.personRole.upsert({
        where: { id: role.id },
        update: {},
        create: role,
      });
    }
    console.log("✅ Cargos: 4 cargos padrão criados");
  } else {
    console.log(`✅ Cargos: ${count} cargos já existem`);
  }
}

main()
  .catch((e) => { console.error("Startup seed error:", e); })
  .finally(() => prisma.$disconnect());
