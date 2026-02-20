const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js");
const fs = require("fs");

process.on("unhandledRejection", err => console.error("Unhandled:", err));
process.on("uncaughtException", err => console.error("Uncaught:", err));

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ THIẾU ENV TOKEN / CLIENT_ID / GUILD_ID");
  process.exit(1);
}

const DATA_FILE = "./data.json";

/* ===== AUTO CREATE DATA FILE ===== */
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    tournament: null,
    teams: {},
    matches: [],
    leaderboard: {}
  }, null, 2));
}

/* ===== DATA HELPERS ===== */
const loadData = () => JSON.parse(fs.readFileSync(DATA_FILE));
const saveData = d => fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));

/* ===== CLIENT ===== */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ===== COMMANDS ===== */
const commands = [
  new SlashCommandBuilder()
    .setName("tournament")
    .setDescription("Quản lý giải")
    .addSubcommand(s => s.setName("create")
      .setDescription("Tạo giải")
      .addStringOption(o => o.setName("name").setRequired(true).setDescription("Tên giải")))
    .addSubcommand(s => s.setName("end").setDescription("Kết thúc giải")),

  new SlashCommandBuilder()
    .setName("team")
    .setDescription("Quản lý team")
    .addSubcommand(s => s.setName("create")
      .setDescription("Tạo team")
      .addStringOption(o => o.setName("name").setRequired(true).setDescription("Tên team")))
    .addSubcommand(s => s.setName("join")
      .setDescription("Vào team")
      .addStringOption(o => o.setName("name").setRequired(true).setDescription("Tên team"))),

  new SlashCommandBuilder().setName("bxh").setDescription("Xem BXH")
].map(c => c.toJSON());

/* ===== READY ===== */
client.once("ready", async () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash commands registered");
});

/* ===== INTERACTIONS ===== */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  const data = loadData();

  if (i.commandName === "tournament") {
    const sub = i.options.getSubcommand();
    if (sub === "create") {
      data.tournament = i.options.getString("name");
      saveData(data);
      return i.reply(`🏆 Đã tạo giải **${data.tournament}**`);
    }
    if (sub === "end") {
      saveData({ tournament: null, teams: {}, matches: [], leaderboard: {} });
      return i.reply("🏁 Đã kết thúc giải");
    }
  }

  if (i.commandName === "team") {
    const sub = i.options.getSubcommand();
    const name = i.options.getString("name");

    if (sub === "create") {
      if (data.teams[name]) return i.reply("❌ Team đã tồn tại");
      data.teams[name] = [];
      data.leaderboard[name] = { win: 0, lose: 0, point: 0 };
      saveData(data);
      return i.reply(`👥 Đã tạo team **${name}**`);
    }

    if (sub === "join") {
      if (!data.teams[name]) return i.reply("❌ Team không tồn tại");
      if (data.teams[name].length >= 5) return i.reply("❌ Team đủ 5 người");
      data.teams[name].push(i.user.id);
      saveData(data);
      return i.reply(`✅ Bạn đã vào **${name}**`);
    }
  }

  if (i.commandName === "bxh") {
    const sorted = Object.entries(data.leaderboard)
      .sort((a, b) => b[1].point - a[1].point);

    if (!sorted.length) return i.reply("📭 Chưa có BXH");

    let msg = "🏆 **BXH CS2**\n";
    sorted.forEach(([n, s], idx) => {
      msg += `${idx + 1}. ${n} | ${s.win}W-${s.lose}L | ${s.point}đ\n`;
    });

    return i.reply(msg);
  }
});

client.login(TOKEN);
