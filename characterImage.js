import fetch from 'node-fetch';
import fs from 'fs';


export class wallpaper extends plugin {
    constructor () {
        super({
            name: '图库',
            dsc: '纳西妲世界第一可爱',
            event: 'message',
            priority: 500,
            rule: [
                {
                    reg: "^#图库统计",
                    fnc: 'countImageNumber',
                },
                {
                    reg: "(纳西妲|妲妲妲)",
                    fnc: 'sendImage',
                    character: "naxida"
                },{
                    reg: "(花火)",
                    fnc: 'sendImage',
                    character: "huahuo"
                },{
                    reg: "(芙宁娜|芙芙)",
                    fnc: 'sendImage',
                    character: "fufu"
                },{
                    reg: "(流萤)",
                    fnc: 'sendImage',
                    character: "liuying"
                },{
                    reg: "(奶奶|茜特菈莉)",
                    fnc: 'sendImage', 
                    character: "nainai"
                },{
                    reg: "(胡桃)",
                    fnc: 'sendImage',
                    character: "hutao"
                }
            ]
        }),
        // 语录文本API（来源自网络公共API）
        this.textUrls = [
            'https://api.lovelive.tools/api/SweetNothings',
            'https://api.uomg.com/api/rand.qinghua?format=text'
        ]
        // 语录API索引
        this.textIndex = 0

        // 图片API
        // this.baseUrl = "http://xiaoan.website:9999?"
        this.baseUrl = ""
    }

    // 发送图片
	async sendImage(e) {
        // 获取对应角色下的索引名称
        let character = this.rule.filter(obj => obj.fnc == "sendImage" && RegExp(obj.reg).test(e.msg)).map(obj => obj.character);
        if(character.length == 0){
            return true;
        }

        let fileUrl = "";
        if(this.baseUrl && this.baseUrl != ""){
            // 远程服务
            fileUrl = this.baseUrl + "c=" + character[0];
        }else{
            // 本地路径
            fileUrl = randomFilePicker.getFile(character[0]);
        }
        
        // 获取语录文本
        let text = await this.fetchNextUrl();
        text = text.replaceAll("<br>", "\n") + this.baseUrl;
        console.log(fileUrl);
        //发送消息
        e.reply([text, segment.image(fileUrl)]);

        return true; //返回true 阻挡消息不再往下
    }
    
    // 获取语录文本
    async fetchNextUrl() {
        if (this.textIndex >= this.textUrls.length) {
          // 所有请求都完成了
          console.log("请求完毕！");
          return null;
        }
        try {
            let response = await fetch(this.textUrls[this.textIndex]);
            if (!response.ok) {
                // 如果响应不是成功的状态，则调用失败回调并继续请求下一个网址
                console.log(`服务器响应失败<${response.status}>: ${this.textUrls[this.textIndex]}`);
                return await this.fetchNextUrl(this.textIndex + 1);
            } else {
                // 如果响应成功，则调用成功回调并停止进一步的请求
                return await response.text();
            }
        } catch (error) {
            // 如果在请求过程中发生错误，则调用失败回调并继续请求下一个网址
            console.log(`请求发生错误[${this.textIndex}]: ${this.textUrls[this.textIndex]}`);
            return this.fetchNextUrl(this.textIndex + 1);
        }
    }

    // 统计图片数量
    async countImageNumber(e){
        const fileCountList = randomFilePicker.countFilesInDirectory();
        // 转为字符串
        const text = fileCountList.map(item => {
            const key = Object.keys(item)[0];
            const value = item[key];
            return `${key}: ${value}`;
        }).join('\n');

        //发送消息
        e.reply([text]);
        return true; //返回true 阻挡消息不再往下
    }
}

// 随机文件获取类
class RandomFilePicker {
    constructor() {
        // 图片路径
        this.imageDir = "/app/resources/images/";   
        // 存储不同路径对应的文件数组
        this.dirFiles = new Map();

        this.#initDirFiles();
    }

    // 初始化文件信息
    #initDirFiles(){
        try {
            const entries = fs.readdirSync(this.imageDir, { withFileTypes: true });
            // 过滤出子文件夹
            const folders = entries.filter(entry => entry.isDirectory());
            // 遍历每个子文件夹并读取其文件
            folders.forEach(folder => {
                const folderPath = this.imageDir + "/" +folder.name;
                // 获取子文件夹中的所有文件
                const files = fs.readdirSync(folderPath);
                this.#shuffle(files);
                // 将文件夹名称和文件数组存入 Map
                this.dirFiles.set(folder.name, {
                    // 用于记录最大的可用文件个数，每次获取文件都会减少1
                    count: files.length,
                    files: files
                });
            });
        } catch (error) {
            console.error('读取目录出错:', error);
        }
    }

    // 从文件列表里获取一个文件，并从数组中移除该文件
    getFile(folderName) {
        if(!folderName || folderName == ""){
            return null;
        }
        let folderInfo = this.dirFiles.get(folderName);
        
        if(folderInfo.files.length == 0){
            return null;
        }

        if(folderInfo.count == 0){
            // 如果可用文件数为0，则对文件列表进行洗牌
            this.#shuffle(folderInfo.files);
            // 重置计数
            folderInfo.count = folderInfo.files.length;
        }
        return this.imageDir + "/" + folderName + "/" + folderInfo.files[--folderInfo.count];
        
    }

    countFilesInDirectory(){
        const result = [];
        // 读取目录内容
        const files = fs.readdirSync(this.imageDir, { withFileTypes: true });
        // 遍历每个文件和子目录
        files.forEach(file => {
            if (file.isDirectory()) {
                const subDirPath = this.imageDir + '/' + file.name;

                // 读取子目录中的文件
                const subFiles = fs.readdirSync(subDirPath);
                const fileCount = subFiles.filter(subFile => {
                    return fs.statSync(subDirPath + '/' + subFile).isFile();
                }).length;

                // 将文件名称和数量添加到结果数组
                result.push({ [file.name]: fileCount });
            }
        });

        return result;
    }

    // 洗牌算法
    #shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            // 在 [0, i] 范围内随机选择一个索引
            const j = Math.floor(Math.random() * (i + 1));
            // 交换元素
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

const randomFilePicker = new RandomFilePicker();
