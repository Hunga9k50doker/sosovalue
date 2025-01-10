require("dotenv").config();
const { _isArray } = require("../utils.js");

const settings = {
  TIME_SLEEP: process.env.TIME_SLEEP ? parseInt(process.env.TIME_SLEEP) : 8,
  MAX_THEADS: process.env.MAX_THEADS ? parseInt(process.env.MAX_THEADS) : 10,
  MAX_LEVEL_UGRADE_BOOST: process.env.MAX_LEVEL_UGRADE_BOOST ? parseInt(process.env.MAX_LEVEL_UGRADE_BOOST) : 10,
  MAX_THEADS_NO_PROXY: process.env.MAX_THEADS_NO_PROXY ? parseInt(process.env.MAX_THEADS_NO_PROXY) : 10,
  MAX_AMOUNT_GACHA: process.env.MAX_AMOUNT_GACHA ? parseInt(process.env.MAX_AMOUNT_GACHA) : 100,

  SKIP_TASKS: process.env.SKIP_TASKS ? JSON.parse(process.env.SKIP_TASKS.replace(/'/g, '"')) : [],
  TYPE_UGRADE_BOOST: process.env.TYPE_UGRADE_BOOST ? JSON.parse(process.env.TYPE_UGRADE_BOOST.replace(/'/g, '"')) : [],
  TYPE_HERO_RESET: process.env.TYPE_HERO_RESET ? JSON.parse(process.env.TYPE_HERO_RESET.replace(/'/g, '"')) : [],
  REF_CODE: process.env.REF_CODE ? JSON.parse(process.env.REF_CODE.replace(/'/g, '"')) : ["N30PG810"],

  AUTO_TASK: process.env.AUTO_TASK ? process.env.AUTO_TASK.toLowerCase() === "true" : false,
  AUTO_TAP: process.env.AUTO_TAP ? process.env.AUTO_TAP.toLowerCase() === "true" : false,
  AUTO_CHALLENGE: process.env.AUTO_CHALLENGE ? process.env.AUTO_CHALLENGE.toLowerCase() === "true" : false,
  ENABLE_MAP_RANGE_CHALLENGE: process.env.ENABLE_MAP_RANGE_CHALLENGE ? process.env.ENABLE_MAP_RANGE_CHALLENGE.toLowerCase() === "true" : false,

  AUTO_SHOW_COUNT_DOWN_TIME_SLEEP: process.env.AUTO_SHOW_COUNT_DOWN_TIME_SLEEP ? process.env.AUTO_SHOW_COUNT_DOWN_TIME_SLEEP.toLowerCase() === "true" : false,
  AUTO_CLAIM_BONUS: process.env.AUTO_CLAIM_BONUS ? process.env.AUTO_CLAIM_BONUS.toLowerCase() === "true" : false,
  ENABLE_ADVANCED_MERGE: process.env.ENABLE_ADVANCED_MERGE ? process.env.ENABLE_ADVANCED_MERGE.toLowerCase() === "true" : false,
  ENABLE_DEBUG: process.env.ENABLE_DEBUG ? process.env.ENABLE_DEBUG.toLowerCase() === "true" : false,

  AUTO_UGRADE_BOOST: process.env.AUTO_UGRADE_BOOST ? process.env.AUTO_UGRADE_BOOST.toLowerCase() === "true" : false,
  AUTO_RESET_HERO: process.env.AUTO_RESET_HERO ? process.env.AUTO_RESET_HERO.toLowerCase() === "true" : false,
  CONNECT_WALLET: process.env.CONNECT_WALLET ? process.env.CONNECT_WALLET.toLowerCase() === "true" : false,

  ADVANCED_ANTI_DETECTION: process.env.ADVANCED_ANTI_DETECTION ? process.env.ADVANCED_ANTI_DETECTION.toLowerCase() === "true" : false,
  AUTO_CODE_GATEWAY: process.env.AUTO_CODE_GATEWAY ? process.env.AUTO_CODE_GATEWAY.toLowerCase() === "true" : false,

  API_ID: process.env.API_ID ? process.env.API_ID : null,
  BASE_URL: process.env.BASE_URL ? process.env.BASE_URL : "https://gw.sosovalue.com/tavern/api/tg/",
  REF_ID: process.env.REF_ID ? process.env.REF_ID : "N30PG810",

  DELAY_BETWEEN_REQUESTS: process.env.DELAY_BETWEEN_REQUESTS && _isArray(process.env.DELAY_BETWEEN_REQUESTS) ? JSON.parse(process.env.DELAY_BETWEEN_REQUESTS) : [1, 5],
  DELAY_START_BOT: process.env.DELAY_START_BOT && _isArray(process.env.DELAY_START_BOT) ? JSON.parse(process.env.DELAY_START_BOT) : [1, 15],
  MAP_RANGE_CHALLENGE: process.env.MAP_RANGE_CHALLENGE && _isArray(process.env.MAP_RANGE_CHALLENGE) ? JSON.parse(process.env.MAP_RANGE_CHALLENGE) : [0, 0],
};

module.exports = settings;