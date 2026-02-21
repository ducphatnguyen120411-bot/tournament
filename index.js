const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE = "1471860721108123893";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// ===== LOAD / SAVE DATA =====
function loadData() {
  if (!fs.existsSync("data.json")) return {};
  return JSON.parse(fs.readFileSync("data.json", "utf8"));
}

function saveData(data) {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

// ===== READY =====
client.once("clientReady", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const args = message.content.trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();

  const guild = await client.guilds.fetch(GUILD_ID);
  const role = guild.roles.cache.get(REQUIRED_ROLE);
  if (!role) return message.reply("❌ Không tìm thấy role BXH");

  let data = loadData();

  // ===== WIN / LOSE =====
  if (cmd === "win" || cmd === "lose") {
    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Mention người cần cộng điểm");

    if (!member.roles.cache.has(REQUIRED_ROLE)) {
      return message.reply("❌ Người này không thuộc role thi đấu");
    }

    if (!data[member.id]) {
      data[member.id] = { win: 0, lose: 0 };
    }

    data[member.id][cmd]++;
    saveData(data);

    return message.reply(
      `✅ Đã cộng **${cmd.toUpperCase()}** cho ${member.user.tag}`
    );
  }

  // ===== BXH =====
  if (cmd === "bxh") {
    // đảm bảo 100% member có role đều có data
    for (const [id] of role.members) {
      if (!data[id]) {
        data[id] = { win: 0, lose: 0 };
      }
    }
    saveData(data);

    const list = Object.entries(data)
      .filter(([id]) => role.members.has(id))
      .map(([id, d]) => ({
        id,
        win: d.win,
        lose: d.lose,
      }))
      .sort((a, b) => {
        if (b.win !== a.win) return b.win - a.win;
        return a.lose - b.lose;
      });

    if (list.length === 0) {
      return message.reply("❌ BXH trống");
    }

    let text = "🏆 **BXH GIẢI ĐẤU** 🏆\n\n";
    list.forEach((u, i) => {
      const user = guild.members.cache.get(u.id);
      text += `${i + 1}. ${user ? user.user.tag : u.id} — ${u.win} WIN | ${u.lose} LOSE\n`;
    });

    return message.reply(text);
  }
});

// ===== LOGIN =====
client.login(TOKEN);
