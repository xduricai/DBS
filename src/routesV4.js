const express = require("express");
const router = express.Router();
const { PrismaClient } = require('@prisma/client')
const {client} = require("./database.js");

const prisma = new PrismaClient()

router.get("/patches", async (req,res) => {
    const patches = await prisma.patches.findMany({
        select: {
            name: true,
            release_date: true
        },
        orderBy: {
            name: 'asc'
        }
    });

    const matches = await prisma.matches.findMany({
       select: {
           id: true,
           duration: true,
           start_time: true
       },
       orderBy: {
           id: 'asc'
       }
    });

    let data = {
        patches: []
    }

    let count = -1;

    for(let patch of patches){
        data.patches.push({
            patch_version: patch.name,
            patch_start_date: patch.release_date.getTime() / 1000,
            patch_end_date: null,
            matches: []
        });

        if(count >= 0){
            data.patches[count].patch_end_date = patch.release_date.getTime() / 1000;
        }
        count++;
    }

    let index = 0;

    for(let match of matches){
        while(match.start_time > data.patches[index].patch_end_date){
            index++;
        }

        data.patches[index].matches.push({
            match_id: match.id,
            duration: Math.round((match.duration/60 + Number.EPSILON) * 100) / 100
        });
    }

    res.status(200);
    res.type("application/json");
    res.json(data);
});

router.get("/players/:player_id/game_exp", async (req,res) => {
    let id = parseInt(req.params.player_id);

    let player = await prisma.players.findMany({
        where: {
            id: id
        },
        select: {
            id: true,
            nick: true,
            matches_players_details: {
                select: {
                    match_id: true,
                    hero_id: true,
                    matches: {
                        select: {
                            duration: true,
                            radiant_win: true
                        }
                    },
                    heroes: {
                        select: {
                            localized_name: true
                        }
                    },
                    xp_hero: true,
                    xp_creep: true,
                    xp_other: true,
                    xp_roshan: true,
                    level: true,
                    player_slot: true
                },
                orderBy: {
                    match_id: 'asc'
                }
            }
        }
    });
    player = player[0];

    let data = {
        id: player.id,
        player_nick: player.nick || "unknown",
        matches: []
    }

    for(let mpd of player.matches_players_details){
        let win = false

        if((mpd.player_slot <= 4 && mpd.player_slot >= 0 && mpd.matches.radiant_win === true) ||
          ((mpd.player_slot <= 132 && mpd.player_slot >= 128 && mpd.matches.radiant_win === false))){
            win = true;
        }


        data.matches.push({
            match_id: mpd.match_id,
            hero_localized_name: mpd.heroes.localized_name,
            match_duration_minutes: Math.round((mpd.matches.duration/60 + Number.EPSILON) * 100) / 100,
            experiences_gained: (mpd.xp_hero + mpd.xp_creep + mpd.xp_other + mpd.xp_roshan),
            level_gained: mpd.level,
            winner: win
        });
    }

    res.status(200);
    res.type("application/json");
    res.json(data);
});

router.get("/players/:player_id/game_objectives", async (req, res) => {
    let id = parseInt(req.params.player_id);

    let player = await prisma.players.findMany({
        where: {
            id: id
        },
        select: {
            id: true,
            nick: true,
            matches_players_details: {
                select: {
                    match_id: true,
                    hero_id: true,
                    heroes: {
                        select: {
                            localized_name: true
                        }
                    },
                    game_objectives_game_objectives_match_player_detail_id_1Tomatches_players_details: {
                        select: {
                            subtype: true
                        }
                    }
                },
                orderBy: {
                    match_id: 'asc'
                }
            }
        }
    });


    player = player[0];

    let data = {
        id: player.id,
        player_nick: player.nick || "unknown",
        matches: []
    }

    for(let mpd of player.matches_players_details){
        let match = {
            match_id: mpd.match_id,
            hero_localized_name: mpd.heroes.localized_name,
            actions: []
        }

        for(let action of mpd.game_objectives_game_objectives_match_player_detail_id_1Tomatches_players_details){
            let found = false;

            for(let entry of match.actions){
                if(entry.hero_action === action.subtype){
                    entry.count++;
                    found = true;
                    break;
                }
            }
            if(found === false){
                match.actions.push({
                    hero_action: action.subtype,
                    count: 1
                })
            }
        }

        if(match.actions.length === 0){
            match.actions.push({
                hero_action: "NO_ACTION",
                count: 1
            });
        }
        else{
            match.actions.sort(function(a, b) {
                let textA = a.hero_action.toUpperCase();
                let textB = b.hero_action.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
        }

        data.matches.push(match);
    }

    res.status(200);
    res.type("application/json");
    res.json(data);
});

router.get("/players/:player_id/abilities", async (req, res) => {
    let id = parseInt(req.params.player_id);

    let player = await prisma.players.findMany({
        where: {
            id: id
        },
        select: {
            id: true,
            nick: true,
            matches_players_details: {
                select: {
                    match_id: true,
                    hero_id: true,
                    heroes: {
                        select: {
                            localized_name: true
                        }
                    },
                    ability_upgrades: {
                        select: {
                            level: true,
                            abilities: {
                                select:{
                                    name: true
                                }
                            }
                        },
                        orderBy: {
                            abilities: {
                                name: 'asc'
                            }
                        }
                    }
                },
                orderBy: {
                    match_id: 'asc'
                }
            }
        }
    });


    player = player[0];

    let data = {
        id: player.id,
        player_nick: player.nick || "unknown",
        matches: []
    }

    for(let mpd of player.matches_players_details){
        let match = {
            match_id: mpd.match_id,
            hero_localized_name: mpd.heroes.localized_name,
            abilities: []
        }

        for(let upgrade of mpd.ability_upgrades){
            let found = false;

            for(let entry of match.abilities){
                if(entry.ability_name === upgrade.abilities.name){
                    entry.count++;
                    entry.upgrade_level = (upgrade.level > entry.upgrade_level ? upgrade.level : entry.upgrade_level);
                    found = true;
                    break;
                }
            }
            if(found === false){
                match.abilities.push({
                    ability_name: upgrade.abilities.name,
                    count: 1,
                    upgrade_level: upgrade.level
                })
            }
        }


        data.matches.push(match);
    }


    res.status(200);
    res.type("application/json");
    res.json(data);
});

router.get("/matches/:match_id/top_purchases", async (req,res) => {
    let id = parseInt(req.params.match_id);

    const heroes = await prisma.matches_players_details.findMany({
        where: {
            match_id: id
        },
        select: {
            player_slot: true,
            hero_id: true,
            heroes: {
                select: {
                    localized_name: true
                }
            },
            matches: {
                select: {
                    radiant_win: true
                }
            },
            purchase_logs: {
                select: {
                    items: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            hero_id: 'asc'
        }
    });

    let min = (heroes[0].matches.radiant_win ? 0 : 128);
    let max = (heroes[0].matches.radiant_win ? 4 : 132);

    let data = {
        id: id,
        heroes: []
    };

    for(let hero of heroes){
        if(hero.player_slot < min || hero.player_slot > max){
            continue;
        }

        let info = {
            id: hero.hero_id,
            name: hero.heroes.localized_name,
            top_purchases: []
        }

        for(let log of hero.purchase_logs){
            let item = info.top_purchases.find(e => e.id === log.items.id);

            if(item === undefined){
                info.top_purchases.push({
                    id: log.items.id,
                    name: log.items.name,
                    count: 1
                });
            }
            else{
                item.count++;
            }
        }

        info.top_purchases.sort(function(a, b) {
            let numA = a.count;
            let numB = b.count;
            if(numA === numB){
                return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
            }
            return (numA > numB) ? -1 : (numA < numB) ? 1 : 0;
        });

        info.top_purchases = info.top_purchases.slice(0, 5);
        data.heroes.push(info);
    }

    res.status(200);
    res.type("application/json");
    res.json(data);
});

router.get("/abilities/:ability_id/usage", async (req,res) => {
    let id = parseInt(req.params.ability_id);

    const upgrades = await prisma.ability_upgrades.findMany({
        where: {
            ability_id: id
        },
        select: {
            time: true,
            abilities: {
                select: {
                    name: true
                }
            },
            matches_players_details: {
                select: {
                    heroes: {
                        select: {
                            id: true,
                            localized_name: true
                        }
                    },
                    player_slot: true,
                    matches: {
                        select: {
                            duration: true,
                            radiant_win: true
                        }
                    }
                }
            }
        }
    });

    if(upgrades[0] === undefined){
        let data = {id:id, name:null, heroes:[]};
        res.status(200);
        res.type("application/json");
        res.json(data);
        return;
    }

    let data = {
        id: id,
        name: upgrades[0].abilities.name,
        heroes: []
    };

    let heroes = []

    for(let upgrade of upgrades){
        let hero = heroes.find(e => e.name === upgrade.matches_players_details.heroes.localized_name)
        let win = true;
        let min = (upgrade.matches_players_details.matches.radiant_win ? 0 : 128);
        let max = (upgrade.matches_players_details.matches.radiant_win ? 4 : 132);

        if(upgrade.matches_players_details.player_slot < min || upgrade.matches_players_details.player_slot > max){
            win = false;
        }

        if(hero === undefined){
            hero = {
                id: upgrade.matches_players_details.heroes.id,
                name: upgrade.matches_players_details.heroes.localized_name,
                winners: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                losers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }
            heroes.push(hero);
        }

        let index = Math.floor((upgrade.time / upgrade.matches_players_details.matches.duration)*10);

        if(index > 10){
            index = 10;
        }

        if(win === true){
            hero.winners[index]++;
        }
        else{
            hero.losers[index]++;
        }
    }

    for(let hero of heroes){

        let entry = {
            id: hero.id,
            name: hero.name
        }

        let max = Math.max(...hero.winners);
        let index = hero.winners.indexOf(max);

        if(max > 0){
            entry.usage_winners = {
                bucket: `${index*10}-${index*10+9}`,
                count: max
            }
        }

        max = Math.max(...hero.losers);
        index = hero.losers.indexOf(max);

        if(max > 0){
            entry.usage_loosers = {
                bucket: `${index*10}-${index*10+9}`,
                count: max
            }
        }

        data.heroes.push(entry)
    }

    data.heroes.sort(function(a, b) {
        let textA = a.name.toUpperCase();
        let textB = b.name.toUpperCase();
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });

    res.status(200);
    res.type("application/json");
    res.json(data);
});

router.get("/statistics/tower_kills", async (req,res) => {
    /*const kills = await prisma.matches_players_details.findMany({
        select: {
            heroes: {
                select:{
                    id: true,
                    localized_name: true
                }
            },
            game_objectives_game_objectives_match_player_detail_id_1Tomatches_players_details: {
                select: {
                    subtype: true
                }
            }
        },
    });

    console.log(kills); */

    let data = {
        heroes: []
    };

    res.status(200);
    res.type("application/json");
    res.json(data);
});

module.exports = router;