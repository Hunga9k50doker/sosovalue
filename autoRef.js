const axios = require("axios");
const { default: chalk } = require("chalk");
const cheerio = require("cheerio");
const readlineSync = require("readline-sync");
const fs = require("fs");
const { faker } = require("@faker-js/faker");
const { HttpsProxyAgent } = require("https-proxy-agent");
const settings = require("./config/config");
const Mailjs = require("@cemalgnlts/mailjs");
const { generateUserId } = require("./utils");
const mailjs = new Mailjs();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let axiosConfig = {};
let proxyList = [];
let useProxy = false;
const maxRetries = 3;

function getProxyAgent(proxyUrl) {
  try {
    const isSocks = proxyUrl.toLowerCase().startsWith("socks");
    if (isSocks) {
      const { SocksProxyAgent } = require("socks-proxy-agent");
      return new SocksProxyAgent(proxyUrl);
    }
    return new HttpsProxyAgent(proxyUrl.startsWith("http") ? proxyUrl : `http://${proxyUrl}`);
  } catch (error) {
    console.log(chalk.red(`[!] Error creating proxy agent: ${error.message}`));
    return null;
  }
}

function loadProxies() {
  try {
    const proxyFile = fs.readFileSync("proxy.txt", "utf8");
    proxyList = proxyFile
      .split("\n")
      .filter((line) => line.trim())
      .map((proxy) => {
        proxy = proxy.trim();
        if (!proxy.includes("://")) {
          return `http://${proxy}`;
        }
        return proxy;
      });

    if (proxyList.length === 0) {
      throw new Error("No proxies found in proxy.txt");
    }
    console.log(chalk.green(`✓ Loaded ${proxyList.length} proxies from proxy.txt`));
    return true;
  } catch (error) {
    console.error(chalk.red(`[!] Error loading proxies: ${error.message}`));
    return false;
  }
}

async function checkIP() {
  try {
    const response = await axios.get("https://api.ipify.org?format=json", axiosConfig);
    const ip = response.data.ip;
    console.log(chalk.green(`[+] Current IP: ${ip}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`[!] Failed to get IP: ${error.message}`));
    return false;
  }
}

async function getRandomProxy() {
  if (!useProxy || proxyList.length === 0) {
    axiosConfig = {};
    await checkIP();
    return true;
  }

  let proxyAttempt = 0;
  while (proxyAttempt < proxyList.length) {
    const proxy = proxyList[Math.floor(Math.random() * proxyList.length)];
    try {
      const agent = getProxyAgent(proxy);
      if (!agent) continue;

      axiosConfig.httpsAgent = agent;
      await checkIP();
      return true;
    } catch (error) {
      proxyAttempt++;
    }
  }

  console.log(chalk.red("[!] Using default IP"));
  axiosConfig = {};
  await checkIP();
  return false;
}

async function getDomains() {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const key = String.fromCharCode(97 + Math.floor(Math.random() * 26)) + String.fromCharCode(97 + Math.floor(Math.random() * 26));

      console.log(chalk.cyan(`[*] Fetching domains with key: ${key}`));
      const response = await axios.get(`https://generator.email/search.php?key=${key}`, axiosConfig);
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
      attempt++;
      await delay(2000);
    } catch (error) {
      console.error(chalk.red(`[!] Error fetching domains: ${error.message}`));
      if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
        await getRandomProxy();
      }
      attempt++;
      await delay(2000);
    }
  }
  return [];
}

function encodeBase64(str) {
  return Buffer.from(str).toString("base64");
}

function randomEmail(domain) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, "");
  const cleanLastName = lastName.replace(/[^a-zA-Z]/g, "");

  const randomNum = Math.floor(Math.random() * 900) + 100;
  const emailName = `${cleanFirstName.toLowerCase()}${cleanLastName.toLowerCase()}${randomNum}`;

  return {
    name: emailName,
    email: `${emailName}@${domain}`,
  };
}

async function register(email, password) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      console.log(chalk.cyan(`[*] Processing registration for ${email}...`));

      if (!email || typeof email !== "string") {
        throw new Error("Email must be a string");
      }

      if (!password || typeof password !== "string") {
        throw new Error("Password must be a string");
      }

      const encodedPassword = encodeBase64(password);

      const data = {
        password: encodedPassword,
        rePassword: encodedPassword,
        username: email,
        email: email,
      };

      const response = await axios.post("https://gw.sosovalue.com/usercenter/email/anno/sendRegisterVerifyCode/V2", data, axiosConfig);
      console.log(chalk.green(`[+] Registration successful for ${email}`));
      return response.data;
    } catch (error) {
      console.log(chalk.red(`[!] Registration failed: ${error.message}`));
      if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
        await getRandomProxy();
      }
      attempt++;
      if (attempt < maxRetries) {
        await delay(2000);
      } else {
        throw error;
      }
    }
  }
}

async function verifEmail(email, password, verifyCode, invitationCode) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      console.log(chalk.cyan(`[*] Verifying email...`));

      const encodedPassword = encodeBase64(password);
      const data = {
        password: encodedPassword,
        rePassword: encodedPassword,
        username: email,
        email: email,
        verifyCode: verifyCode,
        invitationCode: invitationCode,
        invitationFrom: null,
      };

      const response = await axios.post("https://gw.sosovalue.com/usercenter/user/anno/v3/register", data, axiosConfig);
      if (response.data.code === 0) {
        console.log(chalk.green(`[+] Account created successfully with referral code: ${invitationCode}`));
        return response.data;
      }
      throw new Error(`Invalid response code: ${response.data.code}`);
    } catch (error) {
      console.log(chalk.red(`[!] Verification failed: ${error.message}`));
      if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
        await getRandomProxy();
      }
      attempt++;
      if (attempt < maxRetries) {
        await delay(2000);
      } else {
        throw error;
      }
    }
  }
}

async function getOTP(email, domain, index = 0) {
  for (let inboxNum = 1; inboxNum <= 9; inboxNum++) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log(chalk.cyan(`[*] Checking inbox ${inboxNum}...`));

        const response = await axios.get(`https://generator.email/inbox${inboxNum}/`, {
          ...axiosConfig,
          headers: {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            cookie: `_gid=GA1.2.2095327855.1735069411; __gads=ID=52c0ef95ece1dcd3:T=1723296851:RT=1735074556:S=ALNI_MY-N05jLZ5xHVJagROLPVaB7iMLRw; __gpi=UID=00000ebb7726ad8a:T=1723296851:RT=1735074556:S=ALNI_MZmpm9iDReVIrzNmydV67PPYNJhQw; __eoi=ID=50b40b8c429867d1:T=1723296851:RT=1735074556:S=AA-AfjYcohPcYMEyMXK2GgCw44zC; embx=%5B%${email}%40${domain}%22%2C%${email}%40${domain}%22%5D; _gat_gtag_UA_35796116_32=1; _ga=GA1.2.1660632963.1723296850; surl=${domain}/${email}; FCNEC=%5B%5B%22AKsRol-Lci8hCqIvO_xclbprHLQSsPjFOFt6Pu7w2kyTOo7Ahz83hFD5UlFG9kiq9pVZq23iGbdhLjdGucomp2CbWu2ZinNJRZYX3Xox3-XDAQ1imUiw8JveMOGFIHmDhh-EG1jHAFbEhKA-9N1aQd-DPg26Dn263A%3D%3D%22%5D%5D; _ga_1GPPTBHNKN=GS1.1.1735073618.15.1.1735074641.40.0.0`,
            priority: "u=0, i",
            "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
        });

        const $ = cheerio.load(response.data);
        const containerElements = $(".e7m.container.to1").eq(2).html();
        const regex = /SoSoValue\s*-\s*(\d+)/;

        if (containerElements) {
          const match = containerElements.match(regex);
          if (match) {
            const otp = match[1];
            console.log(chalk.green(`[+] OTP found: ${otp}`));
            return otp;
          }
        }

        console.log(chalk.yellow(`[!] No OTP found in inbox ${inboxNum}, waiting 3 seconds...`));
        await delay(3000);
        break;
      } catch (error) {
        console.log(chalk.red(`[!] Error checking inbox ${inboxNum}: ${error.message}`));
        if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
          await getRandomProxy();
        }
        attempt++;
        if (attempt < maxRetries) {
          await delay(3000);
        }
      }
    }
  }
  return false;
}

async function getOTPLogin(email) {
  if (!email || typeof email !== "string") {
    throw new Error("Email must be a string");
  }

  const data = { email: email };

  try {
    const response = await axios.post("https://gw.sosovalue.com/usercenter/email/anno/sendNewDeviceVerifyCode", data, axiosConfig);
    if (response.data.code === 0) {
      console.log(chalk.cyan(`[*] OTP code sent successfully`));
    }
    return response.data;
  } catch (error) {
    console.error(chalk.red(`[!] Error: ${error.response ? error.response.data : error.message}`));
    throw error;
  }
}

async function verifLogin(email, password, verifyCode) {
  if (!email || typeof email !== "string") {
    throw new Error("Email must be a string");
  }
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a string");
  }
  if (!verifyCode || typeof verifyCode !== "string") {
    throw new Error("VerifyCode must be a string");
  }

  const encodedPassword = encodeBase64(password);

  const data = {
    isDifferent: true,
    password: encodedPassword,
    loginName: email,
    type: "portal",
    verifyCode: verifyCode,
  };

  try {
    const response = await axios.post("https://gw.sosovalue.com/authentication/auth/v2/emailPasswordLogin", data, axiosConfig);
    if (response.data.code === 0) {
      console.log(chalk.green(`[+] Login successful, wallet address: ${response.data.data.walletAddress}`));
    }
    return response.data;
  } catch (error) {
    console.error(chalk.red(`[!] Error: ${error.response ? error.response.data : error.message}`));
    throw error;
  }
}

async function loginToken(token, email, password) {
  try {
    const response = await axios.get("https://gw.sosovalue.com/authentication/user/getUserInfo", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      ...axiosConfig,
    });
    fs.appendFileSync("results.txt", `${email}|${password}|${response.data.data.invitationCode}|isRobot: ${response.data.data.isRobot}|isSuspicious: ${response.data.data.isSuspicious}\n`, "utf8");
    fs.appendFileSync("refcodeonly.txt", `${response.data.data.invitationCode}\n`, "utf8");
    return response;
  } catch (error) {
    console.error(chalk.red("[!] Error:", error.message));
    return false;
  }
}

async function processRegistration(accountIndex, totalAccounts, invite, password) {
  let success = false;
  let attempt = 0;

  while (!success && attempt < maxRetries) {
    attempt++;
    console.log(chalk.magenta(`\n[Account ${accountIndex + 1}/${totalAccounts}]`));
    console.log(chalk.yellow("----------------------------------------"));

    try {
      if (useProxy) {
        await getRandomProxy();
      }

      const domains = await getDomains();
      console.log(domains);
      if (domains.length === 0) {
        throw new Error("Failed to fetch domains");
      }

      console.log(chalk.green(`[+] Found ${domains.length} domains\n`));
      // const selectedDomain = domains[Math.floor(Math.random() * domains.length)];
      // const randEmail = randomEmail(selectedDomain);
      const account = await mailjs.createOneAccount();
      // const password = account.data.password;
      const email = account.data.username;
      const selectedDomain = email.split("@")[1];
      const name = generateUserId();
      const randEmail = {
        email: email,
        name: name,
        password: password,
        domain: selectedDomain,
      };

      if (email === undefined) {
        continue;
      }
      const regis = await register(randEmail.email, password);
      if (regis.code !== 0) {
        console.log(chalk.red(`[!] Email ${randEmail.email} is already in use`));
        continue;
      }

      const otp = await getOTP(randEmail.name, selectedDomain);
      if (!otp) {
        throw new Error("Failed to get registration OTP");
      }

      await verifEmail(randEmail.email, password, otp, invite);

      console.log(chalk.green(`[+] Account created successfully: ${randEmail.email}`));

      console.log(chalk.cyan(`[*] Attempting login for account: ${randEmail.email}`));
      const regLogin = await getOTPLogin(randEmail.email);
      if (regLogin.code !== 0) {
        console.log(chalk.red(`[!] Login request failed for ${randEmail.email}`));
        continue;
      }

      await delay(5000);
      const loginOtp = await getOTP(randEmail.name, selectedDomain, 1);
      if (!loginOtp) {
        throw new Error("Failed to get login OTP");
      }

      const verifLogins = await verifLogin(randEmail.email, password, loginOtp);
      if (verifLogins.code !== 0) {
        console.log(chalk.red(`[!] Login verification failed for ${randEmail.email}`));
        continue;
      }

      const login = await loginToken(verifLogins.data.token, randEmail.email, password);
      if (!login || (login.data && login.data.code !== 0)) {
        console.log(chalk.red(`[!] Failed to get user info for ${randEmail.email}`));
        continue;
      }

      console.log(chalk.cyan("\n[+] Login successful with data:"));
      console.log(chalk.cyan(`    → Username: ${login.data.data.username}`));
      console.log(chalk.cyan(`    → Invitation Code: ${login.data.data.invitationCode}`));
      console.log(chalk.cyan(`    → Is Robot: ${login.data.data.isRobot}`));
      console.log(chalk.cyan(`    → Is Suspicious: ${login.data.data.isSuspicious}`));
      console.log(chalk.cyan(`    → Wallet Address: ${verifLogins.data.walletAddress}\n`));

      success = true;
    } catch (error) {
      if (attempt === maxRetries) {
        console.log(chalk.red(`[!] Failed to complete account creation after ${maxRetries} attempts: ${error.message}\n`));
        return false;
      }
      console.log(chalk.yellow(`[!] Process failed, starting attempt ${attempt + 1}...\n`));
      await delay(3000);
    }
  }
  return success;
}

async function processMultiMode(refCodes, password, accountsPerCode) {
  let totalSuccessful = 0;
  let totalFailed = 0;

  for (let i = 0; i < refCodes.length; i++) {
    const invite = refCodes[i];
    console.log(chalk.yellow(`\n===============================================`));
    console.log(chalk.yellow(`Processing Referral Code ${i + 1}/${refCodes.length}: ${invite}`));
    console.log(chalk.yellow(`===============================================\n`));

    let successfulAccounts = 0;
    let failedAccounts = 0;

    for (let j = 0; j < accountsPerCode; j++) {
      const success = await processRegistration(j, accountsPerCode, invite, password);
      if (success) {
        successfulAccounts++;
        totalSuccessful++;
      } else {
        failedAccounts++;
        totalFailed++;
      }
    }

    console.log(chalk.cyan(`\n[*] Results for code ${invite}:`));
    console.log(chalk.green(`[+] Successfully created: ${successfulAccounts} accounts`));
    console.log(chalk.red(`[+] Failed to create: ${failedAccounts} accounts`));
  }

  return { totalSuccessful, totalFailed };
}

(async () => {
  console.clear();
  console.log(chalk.yellow("Tool được phát triển bởi nhóm tele Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc)\n"));

  const ipChoice = readlineSync.question(chalk.cyan("Using Proxy? (y/n): ")).toLowerCase();
  useProxy = ipChoice === "y";

  if (useProxy) {
    loadProxies();
  }

  const password = readlineSync.question(chalk.cyan("Enter password default for all accounts: "), { hideEchoBack: false });

  let results;

  const refCodes = settings.REF_CODE;
  if (refCodes.length === 0) {
    console.log(chalk.red("[!] Cannot proceed without referral codes"));
    return;
  }
  const accountsPerCode = readlineSync.questionInt(chalk.cyan("Number of accounts to create per referral code: "));
  results = await processMultiMode(refCodes, password, accountsPerCode);

  console.log(chalk.green("\n==============================================="));
  console.log(chalk.green(`[+] Registration process completed!`));
  console.log(chalk.cyan(`[*] Successfully created: ${results.totalSuccessful || results.successfulAccounts} accounts`));
  console.log(chalk.red(`[*] Failed to create: ${results.totalFailed || results.failedAccounts} accounts`));
  console.log(chalk.cyan("[*] Check results.txt for account details"));
  console.log(chalk.green("===============================================\n"));
})();
