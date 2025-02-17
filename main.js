const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const user_agents = require("./config/userAgents");
const settings = require("./config/config");
const { sleep, loadData, saveToken, isTokenExpired, parseQueryString, saveJson, updateEnv, generateRandomSixDigitNumber, getRandomWithTimes } = require("./utils");
const { checkBaseUrl } = require("./checkAPI");
const headers = require("./core/header");

class ClientAPI {
  constructor(accountIndex, initData, session_name, baseURL, token) {
    this.accountIndex = accountIndex;
    this.queryId = initData;
    this.headers = headers;
    this.session_name = session_name;
    this.session_user_agents = this.#load_session_data();
    this.baseURL = baseURL;
    this.token = token;
    this.tgToken = "56fbb1c61ab54dab8f78463520245a8c";
  }

  #load_session_data() {
    try {
      const filePath = path.join(process.cwd(), "session_user_agents.json");
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      } else {
        throw error;
      }
    }
  }

  #get_random_user_agent() {
    const randomIndex = Math.floor(Math.random() * user_agents.length);
    return user_agents[randomIndex];
  }

  #get_user_agent() {
    if (this.session_user_agents[this.session_name]) {
      return this.session_user_agents[this.session_name];
    }

    this.log(`Tạo user agent...`);
    const newUserAgent = this.#get_random_user_agent();
    this.session_user_agents[this.session_name] = newUserAgent;
    this.#save_session_data(this.session_user_agents);
    return newUserAgent;
  }

  #save_session_data(session_user_agents) {
    const filePath = path.join(process.cwd(), "session_user_agents.json");
    fs.writeFileSync(filePath, JSON.stringify(session_user_agents, null, 2));
  }

  #get_platform(userAgent) {
    const platformPatterns = [
      { pattern: /iPhone/i, platform: "ios" },
      { pattern: /Android/i, platform: "android" },
      { pattern: /iPad/i, platform: "ios" },
    ];

    for (const { pattern, platform } of platformPatterns) {
      if (pattern.test(userAgent)) {
        return platform;
      }
    }

    return "Unknown";
  }

  set_headers() {
    const platform = this.#get_platform(this.#get_user_agent());
    this.headers["sec-ch-ua"] = `"Not)A;Brand";v="99", "${platform} WebView";v="127", "Chromium";v="127`;
    this.headers["sec-ch-ua-platform"] = platform;
    this.headers["User-Agent"] = this.#get_user_agent();
  }

  async log(msg, type = "info") {
    const accountPrefix = `[Tài khoản ${this.accountIndex + 1}]`;
    let logMessage = "";

    switch (type) {
      case "success":
        logMessage = `${accountPrefix} ${msg}`.green;
        break;
      case "error":
        logMessage = `${accountPrefix} ${msg}`.red;
        break;
      case "warning":
        logMessage = `${accountPrefix} ${msg}`.yellow;
        break;
      case "custom":
        logMessage = `${accountPrefix} ${msg}`.magenta;
        break;
      default:
        logMessage = `${accountPrefix} ${msg}`.blue;
    }
    console.log(logMessage);
  }

  async makeRequest(
    url,
    method,
    data = {},
    options = {
      retries: 1,
      isAuth: false,
    }
  ) {
    const { retries, isAuth } = options;

    const headers = {
      ...this.headers,
    };

    if (!isAuth) {
      headers["Authorization"] = `Bearer ${this.token}`;
      headers["tggametoken"] = this.tgToken;
    }

    let currRetries = 0,
      success = false;
    do {
      try {
        const response = await axios({
          method,
          url: `${url}`,
          data,
          headers,
          timeout: 30000,
        });
        success = true;
        if (response.data) return { success: true, data: response.data.data };
        return { success: false, data: response.data };
      } catch (error) {
        if (error.status == 400) {
          return { success: false, error: error.message };
        }
        this.log(`Yêu cầu thất bại: ${url} | ${error.message} | đang thử lại...`, "warning");
        success = false;
        await sleep(settings.DELAY_BETWEEN_REQUESTS);
        if (currRetries == retries) return { success: false, error: error.message };
      }
      currRetries++;
    } while (currRetries <= retries && !success);
  }

  async auth(payload) {
    return this.makeRequest(`https://gw.sosovalue.com/usercenter/user/thirdPartyLoginWithUserInfo`, "post", payload, { isAuth: true });
  }

  async updateTaskStatus(id) {
    return this.makeRequest(`https://gw.sosovalue.com/task/task/support/changeTaskStatus`, "post", {
      activityType: 2,
      targetTaskStatus: 2,
      taskId: id,
    });
  }

  async adddInvite() {
    return this.makeRequest(`https://gw.sosovalue.com/usercenter/user/addInviter?invitationCode=${settings.REF_ID}`, "post", {});
  }

  async getUserInfo() {
    return this.makeRequest(`https://gw.sosovalue.com/usercenter/user/getUserInfo`, "get");
  }

  async getUserRelatedInfo() {
    return this.makeRequest(`https://gw.sosovalue.com/rights/equity/rab-exp-info/getUserRelatedInfo`, "get");
  }

  async getUserTodayEarnedExpInfo() {
    return this.makeRequest(`https://gw.sosovalue.com/rights/user-exp-change-detail-do/getUserTodayEarnedExpInfo?deviceType=1`, "get");
  }

  async getUserExe() {
    return this.makeRequest(`https://gw.sosovalue.com/rights/equity/rab-exp-info/getUserExe`, "get");
  }

  async checkDailyRoastRecentPicks() {
    return this.makeRequest(`https://gw.sosovalue.com/task/task/support/checkDailyRoastRecentPicks`, "post", { checkType: 1 });
  }

  async checkRoutineTask(id) {
    return this.makeRequest(`https://gw.sosovalue.com/task/task/support/checkRoutineTask`, "post", {
      activityType: 2,
      taskId: id,
    });
  }

  async getTasks() {
    return this.makeRequest(`https://gw.sosovalue.com/task/task-config-do/v1/queryTaskList`, "post", { activityType: "2" });
  }

  async checkInInfo() {
    return this.makeRequest(`${this.baseURL}/signIn/querySignInInfo`, "post", {});
  }

  async checkin() {
    return this.makeRequest(`${this.baseURL}/signIn/signIn`, "post", {});
  }

  async gameLogin() {
    return this.makeRequest(`${this.baseURL}/gameLogin`, "get");
  }

  async getGift() {
    return this.makeRequest(`${this.baseURL}/boost/gift/list`, "get");
  }

  async claimGift(giftId) {
    return this.makeRequest(`${this.baseURL}/boost/gift/receive`, "post", { giftId });
  }

  async getBoostInfo() {
    return this.makeRequest(`${this.baseURL}/boost/queryBasicInfo`, "get");
  }

  async upgradeBoostInfo(payload) {
    return this.makeRequest(`${this.baseURL}/boost/upgrade`, "post", payload);
  }

  async getFullEnergy() {
    return this.makeRequest(`${this.baseURL}/boost/getFullEnergyData`, "get");
  }

  async useFullEnergy() {
    return this.makeRequest(`${this.baseURL}/boost/useFullEnergy`, "get");
  }

  async getBasicParamConfig() {
    return this.makeRequest(`${this.baseURL}/home/getBasicParamConfig`, "get");
  }

  async uploadClickExp(payload) {
    return this.makeRequest(`${this.baseURL}/home/uploadClickExp`, "post", payload);
  }

  async getValidToken() {
    const userId = this.session_name;
    const existingToken = this.token;
    const isExp = isTokenExpired(existingToken);
    if (existingToken && !isExp) {
      this.log("Using valid token", "success");
      return existingToken;
    } else {
      const dataQuery = parseQueryString(this.queryId);
      const user = JSON.parse(dataQuery.user);
      const payload = {
        authDate: dataQuery.authDate,
        firstName: user.first_name || "",
        oauthToken: dataQuery.hash,
        photoUrl: user.photo_url,
        thirdpartyId: user.id,
        thirdpartyName: "telegram",
        username: user.username,
        lastName: user.last_name || "",
        invitationCode: null,
        invitationFrom: null,
      };
      this.log("Token not found or expired, logging in...", "warning");
      // process.exit(0);
      const loginResult = await this.auth(payload);
      if (loginResult.success) {
        const { authInfo } = loginResult.data;
        this.token = authInfo.token;
        saveToken(userId, authInfo.token);
        return authInfo.token;
      }
    }

    return null;
  }

  async handleCheckin() {
    const checkInInfo = await this.checkInInfo();
    if (checkInInfo.success) {
      const { todaySignInStatus, userConsecutiveSignInDay } = checkInInfo.data;
      if (todaySignInStatus == 0) {
        this.log(`Start checkin | Streak: ${userConsecutiveSignInDay} ...`);
        const checkinResult = await this.checkin();
        if (checkinResult.success) {
          const { signInRewardAmount } = checkinResult.data;
          this.log(`Checkin successfully | Reward: ${signInRewardAmount}`, "success");
        } else {
          this.log("Checkin failed", "warning");
        }
      }
    }
  }

  async handleTasks() {
    const results = await this.getTasks();
    if (results.success) {
      this.log(`Starting handle task...`);
      let tasks = [].concat(...Object.values(results.data));
      tasks = tasks.filter((task) => task.needValidation != 1 && task.taskStatus !== 1 && !settings.SKIP_TASKS.includes(task.id)); // Only active tasks
      if (tasks.length == 0) return this.log(`No task available!`, "warning");
      for (const task of tasks) {
        this.log(`Start task ${task.id} | ${task.taskKey}...`);
        let taskStatus = task.taskStatus;
        await sleep(2);
        if (task.taskStatus == 0) {
          const updateTaskStatusRes = await this.updateTaskStatus(task.id);
          if (updateTaskStatusRes.success) {
            this.log(`Task ${task.id} | ${task.taskKey} started!`, "success");
            taskStatus = 2;
          }
        }
        await sleep(1);
        if (taskStatus == 2) {
          const { taskExpirationTime, taskDelayTime, taskConfigDelayTime } = task;
          if (Date.now() > +taskExpirationTime && taskExpirationTime) continue;
          if (+taskDelayTime > 0 && Date.now() < +taskDelayTime) {
            this.log(`Task ${task.id} | ${task.taskKey} | Delay time passed - Watting ${Math.floor(+taskConfigDelayTime / 60)} minutes to complete!`, "warning");
            continue;
          }

          const routineTaskResult = await this.checkRoutineTask(task.id);
          if (routineTaskResult.success) {
            if (routineTaskResult.data.checkResult) this.log(`Task ${task.id} | ${task.taskKey} completed! | Reward: ${task.reward}`, "success");
            else this.log(`Task ${task.id} | ${task.taskKey} faild or need manualy completed!`, "warning");
          } else {
            this.log(`Task ${task.id} | ${task.taskKey} failed!`, "warning");
          }
        }
      }
    }
  }
  async handleTap(data) {
    let { maxEnergy, ownerEnergy } = data;

    const taps = getRandomWithTimes(ownerEnergy, 10);

    for (let i = 0; i < taps.length; i++) {
      await sleep(1);
      this.log(`Tap ${i + 1}/${taps.length} | Exp: ${taps[i]}`);
      ownerEnergy -= taps[i];
      const payload = {
        ...data,
        energyIncrement: maxEnergy - ownerEnergy,
        clickExpIncrement: taps[i],
        reportTime: Date.now(),
        currentEnergy: ownerEnergy,
        currentTotalExp: taps[i],
      };
      const res = await this.uploadClickExp(payload);
      if (res.success) {
        this.log(`Tap ${i + 1} successfully | Exp: +${taps[i]}`, "success");
      }
    }
    const { data: newData } = await this.handleAsycConfig();
    if (newData) {
      const recoverEnergy = await this.handleRecoverEnergy(newData);
      if (recoverEnergy) {
        return await this.handleTap(newData);
      }
    }
  }
  async handleLogin() {
    const res = await this.gameLogin();
    if (res.success) {
      const { tgGameToken } = res.data;
      return tgGameToken;
    }
    return null;
  }
  async handleUpgradeBoost(data) {
    let { totalExp } = data;
    const boostInfo = await this.getBoostInfo();
    if (boostInfo.success) {
      const { boosters } = boostInfo.data;
      if (boosters.length > 0) {
        for (const booster of boosters) {
          if (!settings.TYPE_UGRADE_BOOST.includes(booster.boostName)) continue;
          if (booster.currentLevel < settings.MAX_LEVEL_UGRADE_BOOST && booster.upgradeNeedCostExp <= totalExp) {
            this.log(`Upgrading booster ${booster.boostName}...`);
            await sleep(1);
            const upgradeResult = await this.upgradeBoostInfo({
              boostInfoId: booster.boostInfoId,
              currentLevel: booster.currentLevel,
            });
            if (upgradeResult.success) {
              this.log(`Upgraded booster ${booster.boostInfoId} | ${booster.boostName} successfully! | Level: ${booster.currentLevel + 1}`, "success");
              totalExp -= booster.upgradeNeedCostExp;
            }
          }
        }
      }
    }
  }

  async handleRecoverEnergy(data) {
    const { energy, ownerEnergy } = data;
    const energyResult = await this.getFullEnergy();
    if (energyResult.success) {
      const { poolingStatus, available, total } = energyResult.data;
      if (ownerEnergy < energy && available > 0 && poolingStatus == 1) {
        this.log(`Recovering energy...`);
        await sleep(1);
        const recoverEnergy = await this.useFullEnergy();
        if (recoverEnergy.success) {
          this.log(`Recovered energy successfully!`, "success");
          return true;
        }
      }
    }
    return false;
  }
  async handleGift() {
    const giftInfo = await this.getGift();
    if (giftInfo.success) {
      const giftList = giftInfo.data;
      for (const gift of giftList) {
        if (gift.isReceived == 0) {
          this.log(`Claiming gift ${gift.id} | ${gift.giftName}...`);
          await sleep(1);
          const claimGiftResult = await this.claimGift(gift.id);
          if (claimGiftResult.success) {
            this.log(`Claimed gift ${gift.id} | ${gift.giftName} successfully! | Reward: ${gift.giftRewardAmount}`, "success");
          }
        }
      }
    }
  }

  async handleAsycConfig() {
    return await this.getBasicParamConfig();
  }

  async processAccount() {
    const token = await this.getValidToken();
    if (!token) return this.log(`Can't get token for account ${this.accountIndex + 1}, skipping...`, "error");
    const tgToken = await this.handleLogin();
    if (!tgToken) return this.log(`Can't get tgGameToken for account ${this.accountIndex + 1}, skipping...`, "error");
    this.tgToken = tgToken;

    let userData = { success: false, data: null },
      retries = 0;
    do {
      userData = await this.getUserInfo();
      if (userData?.success) break;
      retries++;
    } while (retries < 2);

    let config = await this.handleAsycConfig();
    const userDataExp = await this.getUserExe();

    if ((userData.success && userData.data) || (config.success && config.data)) {
      const { invitationUserId, userThirdRelationVOS } = userData.data;
      const { currentExp } = userDataExp.data;
      const basicConfig = config.data;
      const { ownerEnergy, totalExp, userLevel } = basicConfig;
      let username = this.session_name;
      if (userThirdRelationVOS?.length > 0) {
        username = userThirdRelationVOS[0].username;
      }
      this.log(`User: ${username} | Exp: ${currentExp} | Value: ${totalExp} | Level: ${userLevel} | Energy: ${ownerEnergy}`);

      if (!invitationUserId) {
        await this.adddInvite();
      }

      await this.checkDailyRoastRecentPicks();
      await this.handleCheckin();

      if (settings.AUTO_TAP) {
        await sleep(1);
        await this.handleTap(basicConfig);
      }

      if (settings.AUTO_TASK) {
        await sleep(1);
        await this.handleTasks();
      }

      if (settings.AUTO_UGRADE_BOOST) {
        await sleep(1);
        await this.handleUpgradeBoost(basicConfig);
      }

      const { data: newData } = await this.handleAsycConfig();
      this.log(`UserId: ${this.session_name} | Total EXP: ${newData.totalExp} | Level: ${newData.userLevel} | Energy: ${newData.ownerEnergy}`, "custom");
    } else {
      return this.log("Can't get use info...skipping", "error");
    }
  }
}

async function main() {
  console.log(colors.yellow("Tool được phát triển bởi nhóm tele Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc)"));

  const { endpoint: hasIDAPI, message } = await checkBaseUrl();
  if (!hasIDAPI) return console.log(`Không thể tìm thấy ID API, thử lại sau!`.red);
  console.log(`${message}`.yellow);

  const data = loadData("data.txt");
  const tokens = require("./token.json");

  const maxThreads = settings.MAX_THEADS_NO_PROXY;
  while (true) {
    for (let i = 0; i < data.length; i += maxThreads) {
      const batch = data.slice(i, i + maxThreads);

      const promises = batch.map(async (initData, indexInBatch) => {
        const accountIndex = i + indexInBatch;
        const userData = JSON.parse(decodeURIComponent(initData.split("user=")[1].split("&")[0]));
        const firstName = userData.first_name || "";
        const lastName = userData.last_name || "";
        const session_name = userData.id;

        console.log(`=========Tài khoản ${accountIndex + 1}| ${firstName + " " + lastName}`.green);
        const client = new ClientAPI(accountIndex, initData, session_name, hasIDAPI, tokens[session_name]);
        client.set_headers();

        return timeout(client.processAccount(), 24 * 60 * 60 * 1000).catch((err) => {
          client.log(`Lỗi xử lý tài khoản: ${err.message}`, "error");
        });
      });
      await Promise.allSettled(promises);
    }
    await sleep(5);
    console.log(`Hoàn thành tất cả tài khoản | Chờ ${settings.TIME_SLEEP} phút=============`.magenta);
    await sleep(settings.TIME_SLEEP * 60);
  }
}

function timeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout"));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
