export const GameplayConfig = {
  // CHOT boi chu du an 2026-07-19: chi chu, 8 block, mob (khong player).
  // "rounding: integer" la GIA DINH tu vi du "76/100" ma chu du an chon — doi tai day neu can.
  targetHud: {
    style: "text" as const,
    rangeBlocks: 8,
    refreshTicks: 5,
    showPlayers: false,
    showMobName: true,
    rounding: "integer" as const,
  },
};
