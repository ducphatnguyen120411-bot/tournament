const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");
const fs = require("fs");

/* ===== ENV ===== */
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Thiếu ENV");
  process.exit(1);
}

/* ===== DATA ===== */
const FILE = "./data.json";
const load = () => JSON.parse(fs.readFileSync(FILE));
const save = d => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

/* ===== CLIENT ===== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ===== COMMANDS ===== */
const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup giải")
    .addSubcommand(s => s.setName("tournament").setDescription("Setup tự động"))
    .addSubcommand(s => s.setName("resultchannel").setDescription("Set kênh ghi kết quả")),

  new SlashCommandBuilder()
    .setName("team")
    .setDescription("Team")
    .addSubcommand(s =>
      s.setName("create").addStringOption(o => o.setName("name").setRequired(true)))
    .addSubcommand(s =>
      s.setName("join").addStringOption(o => o.setName("name").setRequired(true))),

  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Lịch đấu")
    .addSubcommand(s => s.setName("generate").setDescription("Chia lịch")),

  new SlashCommandBuilder()
    .setName("bxh")
    .setDescription("Xem BXH")
].map(c => c.toJSON());

/* ===== READY ===== */
client.once("ready", async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("🤖 Bot online & commands ready");
});

/* ===== HELPERS ===== */
const hasRole = (m, r) => m.roles.cache.some(x => x.name === r);

/* ===== SLASH COMMANDS ===== */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  const data = load();

  /* SETUP */
  if (i.commandName === "setup") {
    if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return i.reply({ content: "❌ Chỉ Admin", ephemeral: true });

    if (i.options.getSubcommand() === "tournament") {
      await i.guild.roles.create({ name: "CB-Player", color: "Blue" });
      await i.guild.roles.create({ name: "Referee", color: "Red" });
      await i.guild.channels.create({ name: "dang-ky-team", type: 0 });
      await i.guild.channels.create({ name: "lich-thi-dau", type: 0 });
      await i.guild.channels.create({ name: "ket-qua", type: 0 });
      await i.guild.channels.create({ name: "bxh", type: 0 });
      return i.reply("✅ Setup xong");
    }

    if (i.options.getSubcommand() === "resultchannel") {
      data.resultChannelId = i.channel.id;
      save(data);
      return i.reply(`✅ Đã set kênh kết quả: <#${i.channel.id}>`);
    }
  }

  /* TEAM */
  if (i.commandName === "team") {
    if (!hasRole(i.member, "CB-Player"))
      return i.reply({ content: "❌ Cần role CB-Player", ephemeral: true });

    const name = i.options.getString("name");

    if (i.options.getSubcommand() === "create") {
      if (data.teams[name]) return i.reply("❌ Team tồn tại");
      data.teams[name] = [i.user.id];
      data.leaderboard[name] = { win: 0, lose: 0, point: 0 };
      save(data);
      return i.reply(`👥 Đã tạo team **${name}**`);
    }

    if (i.options.getSubcommand() === "join") {
      if (!data.teams[name]) return i.reply("❌ Không có team");
      if (data.teams[name].length >= 5) return i.reply("❌ Team đủ người");
      data.teams[name].push(i.user.id);
      save(data);
      return i.reply(`✅ Đã vào team **${name}**`);
    }
  }

  /* SCHEDULE */
  if (i.commandName === "schedule") {
    if (!hasRole(i.member, "Referee"))
      return i.reply({ content: "❌ Chỉ Referee", ephemeral: true });

    const teams = Object.keys(data.teams).filter(t => data.teams[t].length === 5);
    data.matches = [];

    for (let i = 0; i < teams.length; i += 2) {
      if (teams[i + 1]) {
        data.matches.push({
          a: teams[i],
          b: teams[i + 1],
          time: Date.now() + (i + 1) * 3600000
        });
      }
    }
    save(data);

    let msg = "📅 **LỊCH ĐẤU**\n";
    data.matches.forEach(m => {
      msg += `${m.a} 🆚 ${m.b} | <t:${Math.floor(m.time / 1000)}:t>\n`;
    });
    return i.reply(msg);
  }

  /* BXH */
  if (i.commandName === "bxh") {
    const embed = new EmbedBuilder()
      .setTitle("🏆 BXH COUNTER BLOX")
      .setColor("Gold");

    Object.entries(data.leaderboard)
      .sort((a, b) => b[1].point - a[1].point)
      .forEach(([t, s], i) => {
        embed.addFields({
          name: `${i + 1}. ${t}`,
          value: `Win: ${s.win} | Lose: ${s.lose} | Point: ${s.point}`
        });
      });

    return i.reply({ embeds: [embed] });
  }
});

/* ===== GHI KẾT QUẢ (KHÔNG LỆNH) ===== */
client.on("messageCreate", msg => {
  if (msg.author.bot) return;
  const data = load();

  if (!data.resultChannelId) return;
  if (msg.channel.id !== data.resultChannelId) return;
  if (!msg.member.roles.cache.some(r => r.name === "Referee")) return;

  const m = msg.content.match(/^(.+?)\s+(\d+)-(\d+)\s+(.+)$/);
  if (!m) return;

  const [, A, sa, sb, B] = m;
  const a = Number(sa), b = Number(sb);

  if (!data.leaderboard[A] || !data.leaderboard[B])
    return msg.reply("❌ Sai tên team");

  if (a > b) {
    data.leaderboard[A].win++;
    data.leaderboard[A].point += 3;
    data.leaderboard[B].lose++;
  } else if (b > a) {
    data.leaderboard[B].win++;
    data.leaderboard[B].point += 3;
    data.leaderboard[A].lose++;
  } else {
    data.leaderboard[A].point++;
    data.leaderboard[B].point++;
  }

  save(data);
  msg.reply(`📊 ${A} ${a} - ${b} ${B} | Đã cập nhật BXH`);
});

/* ===== REMINDER ===== */
setInterval(() => {
  const data = load();
  const now = Date.now();

  data.matches.forEach(m => {
    const d = m.time - now;
    if (d < 30 * 60000 && !m.r30) {
      m.r30 = true;
      console.log("⏰ Nhắc 30p", m.a, m.b);
    }
    if (d < 10 * 60000 && !m.r10) {
      m.r10 = true;
      console.log("⏰ Nhắc 10p", m.a, m.b);
    }
  });
  save(data);
}, 60000);

client.login(TOKEN);
