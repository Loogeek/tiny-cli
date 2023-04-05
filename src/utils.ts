import path from 'node:path';
import { cwd } from 'node:process';
import fs from 'node:fs';
import figlet from 'figlet';
import tinify from 'tinify';
import chalk from 'chalk';
import chokidar from 'chokidar';
import fse from 'fs-extra';
import ora from 'ora';
import fg from 'fast-glob';
import cac from 'cac';

import type { Config, RecordType } from './types';

const log = console.log;
const RECORD_FILE_PATH = path.resolve(cwd(), 'record.json');
let compressedImagesNumber = 0;
let needCompressImagesNumber = 0;

const cli = cac('tiny-cli').help();

cli.option('-o, --once', 'compress just one');

const parsed = cli.parse();

export async function startOptimize(configs: Config[], APIKey: string) {
  tinify.key = APIKey;

  await ConsoleFiglet('tiny img is running!');

  for (const config of configs) {
    const { targetDir } = config;
    needCompressImagesNumber += await getTargetFileImagesCount(targetDir);
  }

  if (needCompressImagesNumber === 0) {
    console.warn(chalk.red('There is no images need to compress!'));
    process.exit(0);
  }

  for (const config of configs) {
    const { targetDir } = config;
    log(chalk.bgBlue.bold(`${targetDir} is watching~~~\n`));

    chokidar
      .watch(path.resolve(cwd(), targetDir), {
        atomic: true,
        followSymlinks: true,
      })
      .on('all', async (event, pathDir) => {
        switch (event) {
          case 'add':
            await reduceImage(targetDir, pathDir, pathDir);
            break;
          case 'unlink':
            await autoRecord('unlink', targetDir, pathDir);
            break;
          case 'change':
          default:
            break;
        }
      });
  }
}

async function reduceImage(
  watchFileDir: string,
  fileDir: string,
  targetDir: string,
) {
  if (!isImageFile(fileDir)) return;

  const recorded = await isRecord(watchFileDir, fileDir);

  if (recorded) {
    compressedImagesNumber++;
    if (
      compressedImagesNumber === needCompressImagesNumber &&
      parsed.options.once
    ) {
      log(chalk.bgGreen.bold('\n All images have been compressed!'));
      process.exit(0);
    }
  }

  const spinner = ora('Loading').start();
  try {
    spinner.color = 'blue';
    spinner.text = chalk.bold.greenBright(`compressing ${fileDir}`);
    tinify
      .fromFile(fileDir)
      .toFile(targetDir)
      .then(async () => {
        compressedImagesNumber++;
        await autoRecord('add', watchFileDir, fileDir);
        spinner.succeed();

        if (
          compressedImagesNumber === needCompressImagesNumber &&
          parsed.options.once
        ) {
          log(chalk.bgGreen.bold('\n All images have been compressed!'));
          process.exit(0);
        }
      });
  } catch (err) {
    log(chalk.red(`tinify Error: ${err}`));
    spinner.fail();
  }
}

export async function isRecord(watchFileDir: string, filePath: string) {
  const isExist = await isFileExist(RECORD_FILE_PATH);
  const fileName = path.relative(watchFileDir, filePath);
  if (isExist) {
    const json: Object = await fse.readJsonSync(RECORD_FILE_PATH);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (json[fileName] === filePath) {
      return true;
    }
  }
  return false;
}

async function isFileExist(fileDir: string) {
  return new Promise((resolve) => {
    return fs.access(fileDir, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
}

export async function addRecord(watchFileDir: string, pathDir: string) {
  const isExist = await isFileExist(RECORD_FILE_PATH);
  const fileName = path.relative(watchFileDir, pathDir);

  if (isExist) {
    const json: Object = await fse.readJsonSync(RECORD_FILE_PATH);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    json[fileName] = pathDir;

    fse.writeJSONSync(RECORD_FILE_PATH, json);
  } else {
    fse.writeJsonSync(RECORD_FILE_PATH, { [fileName]: pathDir });
  }
}

async function removeRecord(watchFileDir: string, pathDir: string) {
  const isExist = await isFileExist(RECORD_FILE_PATH);
  const fileName = path.relative(watchFileDir, pathDir);

  if (isExist) {
    const json: Object = await fse.readJsonSync(RECORD_FILE_PATH);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete json[fileName];
    fse.writeJSONSync(RECORD_FILE_PATH, json);
  }
}

async function autoRecord(
  action: RecordType,
  watchFileDir: string,
  pathDir: string,
) {
  if (!isImageFile(pathDir)) return;

  switch (action) {
    case 'add':
      await addRecord(watchFileDir, pathDir);
      break;
    case 'unlink':
      await removeRecord(watchFileDir, pathDir);
      break;
    case 'change':
    default:
      break;
  }
}

function getFileName(pathDir: string) {
  return path.basename(pathDir);
}

function getFileExtName(pathDir: string) {
  return path.extname(pathDir).slice(1);
}

function isImageFile(file: string) {
  const fileExtName = getFileExtName(file);
  const supportFiles = ['png', 'jpg', 'jpeg', 'webp'];
  return supportFiles.includes(fileExtName);
}

async function getTargetFileImagesCount(targetPath: string) {
  const patternArray = [
    `${path.join(cwd(), targetPath, '/**/*.png').replace(/\\/g, '/')}`,
    `${path.join(cwd(), targetPath, '/**/*.jpg').replace(/\\/g, '/')}`,
    `${path.join(cwd(), targetPath, '/**/*.jpeg').replace(/\\/g, '/')}`,
  ];

  const entries = await fg(patternArray, { dot: true });

  return entries.length;
}

export function ConsoleFiglet(str: string) {
  return new Promise((resolve, reject) => {
    figlet(str, (err, data) => {
      if (err) {
        log(chalk.red('Something were wrong...'));
        log(chalk.red(err));
        reject(err);
      }

      log(data);
      resolve(data);
    });
  });
}
