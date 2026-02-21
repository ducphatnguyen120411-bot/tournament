const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DATA = {
  setup: false,
  channelId: null,
  refereeRoleId: null,
  teams: {},
  matches: []
};

// ===== BOT ONLINE =====
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // SETUP (admin only)
  if (msg.content.startsWith("setup")) {
    if (!msg.member.permissions.has("Administrator")) {
      return msg.reply("❌ Chỉ admin được setup");
    }

    const role = msg.mentions.roles.first();
    if (!role) return msg.reply("❌ Tag role referee");

    DATA.setup = true;
    DATA.channelId = msg.channel.id;
    DATA.refereeRoleId = role.id;

    return msg.reply("✅ Setup xong. Dùng kênh này để ghi kết quả.");
  }

  // CHỈ HOẠT ĐỘNG SAU SETUP
  if (!DATA.setup) return;
  if (msg.channel.id !== DATA.channelId) return;

  // CHECK ROLE REFEREE
  if (!msg.member.roles.cache.has(DATA.refereeRoleId)) return;

  // FORMAT: TeamA 13-10 TeamB
  const match = msg.content.match(/(.+)\s(\d+)\s*-\s*(\d+)\s(.+)/);
  if (!match) return;

  const teamA = match[1].trim();
  const scoreA = parseInt(match[2]);
  const scoreB = parseInt(match[3]);
  const teamB = match[4].trim();

  if (!DATA.teams[teamA]) DATA.teams[teamA] = 0;
  if (!DATA.teams[teamB]) DATA.teams[teamB] = 0;

  if (scoreA > scoreB) {
    DATA.teams[teamA] += 3;
  } else {
    DATA.teams[teamB] += 3;
  }

  const embed = new EmbedBuilder()
    .setTitle("📊 BẢNG XẾP HẠNG")
    .setColor(0x00ff99)
    .setDescription(
      Object.entries(DATA.teams)
        .sort((a, b) => b[1] - a[1])
        .map(([t, p], i) => `**${i + 1}. ${t}** — ${p} điểm`)
        .join("\n")
    );

  msg.channel.send({ embeds: [embed] });
});

// ===== LOGIN =====
if (!process.env.BOT_TOKEN) {
  console.log("❌ THIẾU BOT_TOKEN");
  process.exit(1);
}

client.login(process.env.BOT_TOKEN);
