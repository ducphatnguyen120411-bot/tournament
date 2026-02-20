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
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");
const fs = require("fs");

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ===== ENV ===== */
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ THIẾU ENV");
  process.exit(1);
}

/* ===== DATA ===== */
const DATA_FILE = "./data.json";
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    teams: {},
    matches: [],
    leaderboard: {}
  }, null, 2));
}
const load = () => JSON.parse(fs.readFileSync(DATA_FILE));
const save = d => fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));

/* ===== CLIENT ===== */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ===== COMMANDS ===== */
const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup giải")
    .addSubcommand(s => s.setName("tournament").setDescription("Setup tự động")),

  new SlashCommandBuilder()
    .setName("team")
    .setDescription("Team Counter Blox")
    .addSubcommand(s =>
      s.setName("create")
        .addStringOption(o => o.setName("name").setRequired(true).setDescription("Tên team")))
    .addSubcommand(s =>
      s.setName("join")
        .addStringOption(o => o.setName("name").setRequired(true).setDescription("Tên team"))),

  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Lịch đấu")
    .addSubcommand(s => s.setName("generate").setDescription("Chia lịch tự động")),

  new SlashCommandBuilder()
    .setName("result")
    .setDescription("Nhập kết quả")
    .addStringOption(o => o.setName("winner").setRequired(true))
    .addStringOption(o => o.setName("loser").setRequired(true))
    .addStringOption(o => o.setName("score").setRequired(true)),

  new SlashCommandBuilder()
    .setName("bxh")
    .setDescription("Xem BXH")
].map(c => c.toJSON());

/* ===== READY ===== */
client.once("ready", async () => {
  console.log(`🤖 Online: ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("✅ Slash commands registered");
});

/* ===== HELPERS ===== */
const hasRole = (member, roleName) =>
  member.roles.cache.some(r => r.name === roleName);

/* ===== INTERACTIONS ===== */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  const data = load();

  /* ===== SETUP ===== */
  if (i.commandName === "setup") {
    if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return i.reply({ content: "❌ Chỉ Admin", ephemeral: true });

    const guild = i.guild;
    await guild.roles.create({ name: "CB-Player", color: "Blue" });
    await guild.roles.create({ name: "Referee", color: "Red" });

    const ch = name => guild.channels.create({ name, type: 0 });
    await ch("dang-ky-team");
    await ch("lich-thi-dau");
    await ch("ket-qua");
    await ch("bxh");
    await ch("huong-dan");

    return i.reply("✅ Setup Counter Blox xong");
  }

  /* ===== TEAM ===== */
  if (i.commandName === "team") {
    if (!hasRole(i.member, "CB-Player"))
      return i.reply({ content: "❌ Cần role CB-Player", ephemeral: true });

    const name = i.options.getString("name");

    if (i.options.getSubcommand() === "create") {
      if (data.teams[name]) return i.reply("❌ Team đã tồn tại");
      data.teams[name] = [i.user.id];
      data.leaderboard[name] = { win: 0, lose: 0, point: 0 };
      save(data);
      return i.reply(`👥 Đã tạo team **${name}**`);
    }

    if (i.options.getSubcommand() === "join") {
      if (!data.teams[name]) return i.reply("❌ Team không tồn tại");
      if (data.teams[name].length >= 5) return i.reply("❌ Team đủ 5 người");
      data.teams[name].push(i.user.id);
      save(data);
      return i.reply(`✅ Đã vào team **${name}**`);
    }
  }

  /* ===== SCHEDULE GENERATE ===== */
  if (i.commandName === "schedule") {
    if (!hasRole(i.member, "Referee"))
      return i.reply({ content: "❌ Chỉ Referee", ephemeral: true });

    const teams = Object.keys(data.teams).filter(t => data.teams[t].length === 5);
    if (teams.length < 2) return i.reply("❌ Không đủ team");

    data.matches = [];
    for (let x = 0; x < teams.length; x += 2) {
      if (teams[x + 1]) {
        const time = Date.now() + (x + 1) * 60 * 60 * 1000;
        data.matches.push({
          a: teams[x],
          b: teams[x + 1],
          time
        });
      }
    }
    save(data);

    let msg = "📅 **LỊCH THI ĐẤU**\n";
    data.matches.forEach(m => {
      msg += `${m.a} 🆚 ${m.b} | <t:${Math.floor(m.time / 1000)}:t>\n`;
    });
    return i.reply(msg);
  }

  /* ===== RESULT ===== */
  if (i.commandName === "result") {
    if (!hasRole(i.member, "Referee"))
      return i.reply({ content: "❌ Chỉ Referee", ephemeral: true });

    const w = i.options.getString("winner");
    const l = i.options.getString("loser");

    data.leaderboard[w].win++;
    data.leaderboard[w].point += 3;
    data.leaderboard[l].lose++;
    save(data);

    return i.reply(`🏆 ${w} thắng ${l}`);
  }

  /* ===== BXH EMBED ===== */
  if (i.commandName === "bxh") {
    const sorted = Object.entries(data.leaderboard)
      .sort((a, b) => b[1].point - a[1].point);

    const embed = new EmbedBuilder()
      .setTitle("🏆 BXH COUNTER BLOX")
      .setColor("Gold");

    sorted.forEach(([n, s], idx) => {
      embed.addFields({
        name: `${idx + 1}. ${n}`,
        value: `Thắng: ${s.win} | Thua: ${s.lose} | Điểm: ${s.point}`,
        inline: false
      });
    });

    return i.reply({ embeds: [embed] });
  }
});

/* ===== AUTO REMINDER ===== */
setInterval(() => {
  const data = load();
  const now = Date.now();

  data.matches.forEach(m => {
    const diff = m.time - now;
    if (diff < 31 * 60 * 1000 && !m.r30) {
      m.r30 = true;
      console.log("⏰ Nhắc 30p", m.a, m.b);
    }
    if (diff < 11 * 60 * 1000 && !m.r10) {
      m.r10 = true;
      console.log("⏰ Nhắc 10p", m.a, m.b);
    }
  });
  save(data);
}, 60 * 1000);

client.login(TOKEN);
