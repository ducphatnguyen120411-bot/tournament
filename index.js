const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js");
const fs = require("fs");

const TOKEN = process.env.TOKEN; // Railway ENV
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Thiếu ENV: TOKEN / CLIENT_ID / GUILD_ID");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const dataFile = "./data.json";

function loadData() {
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

/* ================= SLASH COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName("tournament")
    .setDescription("Quản lý tournament")
    .addSubcommand(s =>
      s.setName("create").setDescription("Tạo giải đấu")
        .addStringOption(o => o.setName("name").setDescription("Tên giải").setRequired(true))
    )
    .addSubcommand(s => s.setName("start").setDescription("Bắt đầu giải"))
    .addSubcommand(s => s.setName("end").setDescription("Kết thúc giải")),

  new SlashCommandBuilder()
    .setName("team")
    .setDescription("Quản lý team")
    .addSubcommand(s =>
      s.setName("create").setDescription("Tạo team")
        .addStringOption(o => o.setName("name").setDescription("Tên team").setRequired(true))
    )
    .addSubcommand(s =>
      s.setName("join").setDescription("Vào team")
        .addStringOption(o => o.setName("name").setDescription("Tên team").setRequired(true))
    ),

  new SlashCommandBuilder()
    .setName("match")
    .setDescription("Lịch thi đấu")
    .addSubcommand(s =>
      s.setName("add").setDescription("Thêm trận đấu")
        .addStringOption(o => o.setName("teama").setRequired(true).setDescription("Team A"))
        .addStringOption(o => o.setName("teamb").setRequired(true).setDescription("Team B"))
        .addStringOption(o => o.setName("time").setRequired(true).setDescription("Thời gian"))
    )
    .addSubcommand(s => s.setName("list").setDescription("Xem lịch đấu")),

  new SlashCommandBuilder()
    .setName("result")
    .setDescription("Nhập kết quả")
    .addStringOption(o => o.setName("winner").setRequired(true).setDescription("Team thắng"))
    .addStringOption(o => o.setName("loser").setRequired(true).setDescription("Team thua"))
    .addStringOption(o => o.setName("score").setRequired(true).setDescription("Tỷ số")),

  new SlashCommandBuilder()
    .setName("bxh")
    .setDescription("Xem bảng xếp hạng")
].map(cmd => cmd.toJSON());

/* ================= REGISTER COMMANDS ================= */

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash commands registered");
})();

/* ================= BOT LOGIC ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const data = loadData();

  /* TOURNAMENT */
  if (interaction.commandName === "tournament") {
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      data.tournament = interaction.options.getString("name");
      saveData(data);
      return interaction.reply(`🏆 Đã tạo giải **${data.tournament}**`);
    }

    if (sub === "start") {
      if (!data.tournament) return interaction.reply("❌ Chưa có giải!");
      return interaction.reply("🚀 Giải đấu bắt đầu!");
    }

    if (sub === "end") {
      data.tournament = null;
      data.teams = {};
      data.matches = [];
      data.leaderboard = {};
      saveData(data);
      return interaction.reply("🏁 Giải đã kết thúc!");
    }
  }

  /* TEAM */
  if (interaction.commandName === "team") {
    const sub = interaction.options.getSubcommand();
    const name = interaction.options.getString("name");

    if (sub === "create") {
      if (data.teams[name]) return interaction.reply("❌ Team đã tồn tại!");
      data.teams[name] = [interaction.user.id];
      data.leaderboard[name] = { win: 0, lose: 0, point: 0 };
      saveData(data);
      return interaction.reply(`👥 Đã tạo team **${name}**`);
    }

    if (sub === "join") {
      if (!data.teams[name]) return interaction.reply("❌ Team không tồn tại!");
      if (data.teams[name].length >= 5) return interaction.reply("❌ Team đủ 5 người!");
      data.teams[name].push(interaction.user.id);
      saveData(data);
      return interaction.reply(`✅ Bạn đã vào team **${name}**`);
    }
  }

  /* MATCH */
  if (interaction.commandName === "match") {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const teamA = interaction.options.getString("teama");
      const teamB = interaction.options.getString("teamb");
      const time = interaction.options.getString("time");

      data.matches.push({ teamA, teamB, time });
      saveData(data);

      return interaction.reply(`📅 ${teamA} 🆚 ${teamB}\n⏰ ${time}`);
    }

    if (sub === "list") {
      if (data.matches.length === 0) return interaction.reply("📭 Chưa có lịch!");
      let msg = "📅 **LỊCH THI ĐẤU**\n";
      data.matches.forEach((m, i) => {
        msg += `${i + 1}. ${m.teamA} 🆚 ${m.teamB} | ${m.time}\n`;
      });
      return interaction.reply(msg);
    }
  }

  /* RESULT */
  if (interaction.commandName === "result") {
    const win = interaction.options.getString("winner");
    const lose = interaction.options.getString("loser");

    if (!data.leaderboard[win] || !data.leaderboard[lose])
      return interaction.reply("❌ Team không hợp lệ!");

    data.leaderboard[win].win++;
    data.leaderboard[win].point += 3;
    data.leaderboard[lose].lose++;

    saveData(data);
    return interaction.reply(`🏆 **${win} thắng ${lose}**`);
  }

  /* BXH */
  if (interaction.commandName === "bxh") {
    const sorted = Object.entries(data.leaderboard)
      .sort((a, b) => b[1].point - a[1].point);

    let msg = "🏆 **BẢNG XẾP HẠNG**\n";
    sorted.forEach(([name, s], i) => {
      msg += `${i + 1}. ${name} | ${s.win}W-${s.lose}L | ${s.point}đ\n`;
    });

    return interaction.reply(msg || "Chưa có BXH");
  }
});

client.once("ready", () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);
});

client.login(TOKEN);
