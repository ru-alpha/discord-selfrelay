var util = require('util');
var auth = require('./auth.json');
var Discord = require('discord.js-selfbot-v13');
var _ = require("underscore");
var logger = require('winston');
    logger.info('Initializing bot');
    logger.level = 'debug';
var bot = new Discord.Client();
    bot.login(auth.token);

var request = require("request");

var channels = auth.channels;
var chanArr = [];
var relay = true;
var timeout;

bot.on('ready', function () {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.user.username + ' - (' + bot.user.id + ')');
});

bot.on('disconnect', function(errMsg, code) {
    logger.warn(errMsg);
    logger.warn('----- Bot disconnected from Discord with code', code, 'for reason:', errMsg, '-----');
    bot.login(auth.token);
});

bot.on('channelUpdate', function(oldChannel, newChannel) {
    console.log('channelUpdate EVENT');
    if (newChannel.permissionOverwrites.has(bot.user.id)) {
        logger.warn('permission change detected');
        logger.warn(newChannel.permissionOverwrites);
        relay = false;
        clearTimeout(timeout);
        timeout = setTimeout(function(){ 
            relay = true; 
        }, 1800000);
    } else {
        console.log('no perm change');
    }
});

bot.on('guildMemberUpdate', function(oldMember, newMember) {
    logger.warn('guildMemberUpdate EVENT');
    if(newMember.id == bot.user.id) {
        delete newMember.guild;
        logger.warn(newMember);
        logger.warn('bot user changed!');
        relay = false;
        clearTimeout(timeout);
        timeout = setTimeout(function(){ 
            relay = true; 
        }, 1800000);
    }
});

bot.on('messageCreate', function (message) {
    logger.debug(`#${message.channel.name} ${message.author.username}: ${message.content}`);

    var obj = _.find(channels, function (obj) { return obj.name === message.channel.id; });

    if (!obj) {
        logger.debug('NO OBJ');
    }
    if (obj) {
        logger.debug(`refusing to relay? ${relay}`);
        if (relay) {
            var post_data = {};
                post_data.username = message.guild.name;

            if (message.content && message.content != '') {
                logger.info(`#${message.channel.name} ${message.author.username}: ${message.content}`);
                post_data.content = `**#${message.channel.name} ${message.author.displayName}**: ${message.content}`
            }

            if (message.embeds.length > 0) {
                logger.debug('==== DEBUG ====');
                logger.debug(util.inspect(message.embeds));
                logger.debug('===============');
                var embed = message.embeds[0];
                delete embed['message'];
                delete embed['createdTimestamp'];
                if (embed['image']) {
                    delete embed['image']['embed'];
                    delete embed['image']['proxyURL'];
                    delete embed['image']['height'];
                    delete embed['image']['width'];
                }
                if (embed['video'])
                    delete embed['video'];
                if (embed['provider'])
                    delete embed['provider'];
                if (embed['fields'].length < 1)
                    delete embed['fields'];
                for (var propName in embed) { 
                    if (embed[propName] === null || embed[propName] === undefined || embed[propName] == []) {
                        delete embed[propName];
                    }
                }
                logger.debug(embed);
                var embedTest = {"color":"#3AA3E3","fields":[{"name":"name","value":"value","inline":false},{"name":"name","value":"value","inline":true}]};
                post_data.embeds = [embed];
            }

            var options = {
                method: 'post',
                body: post_data,
                json: true,
                url: obj.webhook
            };
            request(options, function (err, res, body) {
                if (err) {
                    console.error('error posting json: ', err)
                    throw err
                }
                var headers = res.headers
                var statusCode = res.statusCode
                //console.log('headers: ', headers)
                console.log('Sent webhook statusCode: ', statusCode)
                //console.log('body: ', body)
            });
        } else {
            logger.warn('==== WARN ====');
            logger.warn(`NOT SENDING MESSAGE DUE TO RELAY PROTECTION`);
            logger.warn(`#${message.channel.name} ${message.author.username}: ${message.content}`);
            logger.warn('==============');
        }
    }
});

bot.on('messageUpdate', function (oldMessage, newMessage) {
    // debugging
    logger.debug('==== DEBUG ====');
    logger.debug(`EDIT: #${newMessage.channel.name} ${newMessage.author.username}: ${newMessage.content}`);
    if (newMessage.attachments.length > 0) {
        logger.debug(`newMessage attachments: `);
        logger.debug(util.inspect(newMessage.attachments));
    }
    logger.debug('===============');
});

bot.on('error', function (error) {
    logger.error(error);
});