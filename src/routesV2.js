const express = require("express");
const router = express.Router();
const { client } = require("./database.js");

router.get("/patches", (req,res) => {

    client.query(`SELECT name AS patch_version, patch_start_date, patch_end_date, matches.id AS match_id, ROUND(matches.duration/60.00, 2) AS duration FROM 
                    (
                        SELECT name, CAST(EXTRACT(EPOCH from release_date) as INTEGER) AS patch_start_date, 
                        LEAD(CAST(EXTRACT(EPOCH from release_date) as INTEGER),1) OVER(ORDER BY name) AS patch_end_date FROM patches 
                        ORDER BY name ASC 
                    ) AS patch_log 
                    LEFT JOIN matches ON matches.start_time BETWEEN patch_log.patch_start_date AND patch_log.patch_end_date`, (err, result) => {
        if (err){
            throw err;
        }

        let patches = [];
        let count = -1;
        let current = "";

        for(let row of result.rows){
            if (row.patch_version !== current){
                count++;
                current = row.patch_version;
                patches.push({
                    patch_version: row.patch_version,
                    patch_start_date: row.patch_start_date,
                    patch_end_date: row.patch_end_date,
                    matches: []
                })
            }
            if(row.match_id !== null){
                patches[count].matches.push({
                    match_id: row.match_id,
                    duration: parseFloat(row.duration)
                })
            }
        }

        let data = {
            patches: patches
        }

        res.status(200);
        res.type('application/json');
        res.json(data);
    });
});

router.get("/players/:player_id/game_exp", (req, res) => {
    let id = req.params.player_id;

    client.query(`SELECT players.id, COALESCE(nick, 'unknown') AS player_nick, 
                    heroes.localized_name AS hero_localized_name, matches.id AS match_id, ROUND(matches.duration/60.00, 2) AS match_duration_minutes, 
                    mpd.experiences_gained, mpd.level AS level_gained,
                    CASE WHEN ((matches.radiant_win IS true AND mpd.player_slot >= 0 AND mpd.player_slot <= 4) 
                    OR (matches.radiant_win IS false AND mpd.player_slot >= 128 AND mpd.player_slot <= 132)) THEN true ELSE false END AS winner
                    FROM players, (
                        SELECT hero_id, 
                        match_id, COALESCE(xp_hero, 0) + COALESCE(xp_creep, 0) + COALESCE(xp_other, 0) + COALESCE(xp_roshan, 0) AS experiences_gained, 
                        level, player_slot FROM matches_players_details WHERE player_id = ${id}
                    ) AS mpd
                    LEFT JOIN heroes ON mpd.hero_id = heroes.id
                    LEFT JOIN matches ON mpd.match_id = matches.id
                    GROUP BY players.id, heroes.localized_name, matches.duration, mpd.experiences_gained, mpd.level, mpd.player_slot, matches.id HAVING players.id = ${id} ORDER BY matches.id`, (err, result) => {
        if (err){
            throw err;
        }

        let data;

        if(result.rows[0] === undefined){
            data = {
                "id": id,
                "player_nick": "unknown",
                "matches": []
            };
        }
        else{
            data = {
                "id": result.rows[0].id,
                "player_nick": result.rows[0].player_nick,
                "matches": []
            };

            for(let row of result.rows){
                data.matches.push(
                    {
                        "match_id": row.match_id,
                        "hero_localized_name": row.hero_localized_name,
                        "match_duration_minutes": parseFloat(row.match_duration_minutes),
                        "experiences_gained": row.experiences_gained,
                        "level_gained": row.level_gained,
                        "winner": row.winner
                    }
                );
            }
        }

        res.status(200);
        res.type('application/json');
        res.json(data);
    });
});

router.get("/players/:player_id/game_objectives", (req, res) => {
    let id = req.params.player_id;

    client.query(`SELECT players.id, COALESCE(nick, 'unknown') AS player_nick, 
                    heroes.localized_name AS hero_localized_name, matches.id AS match_id, COALESCE(gobj.subtype, 'NO_ACTION') AS hero_action, COUNT(gobj.subtype)
                    FROM players, (SELECT id, hero_id, match_id FROM matches_players_details WHERE player_id = ${id}) AS mpd
                    LEFT JOIN heroes ON mpd.hero_id = heroes.id
                    LEFT JOIN matches ON mpd.match_id = matches.id
                    LEFT JOIN game_objectives gobj ON mpd.id = gobj.match_player_detail_id_1
                    GROUP BY players.id, heroes.localized_name, matches.id, gobj.subtype HAVING players.id = ${id} ORDER BY matches.id`, (err, result) => {
        if (err){
            throw err;
        }

        let data;

        if(result.rows[0] === undefined){
            data = {
                "id": id,
                "player_nick": "unknown",
                "matches": []
            };
        }
        else{
            data = {
                "id": result.rows[0].id,
                "player_nick": result.rows[0].player_nick,
                "matches": []
            };

            let count = -1;
            let current = -1;

            for(let row of result.rows){
                if(row.match_id !== current){
                    count++;
                    current = row.match_id;

                    data.matches.push({
                        "match_id": row.match_id,
                        "hero_localized_name": row.hero_localized_name,
                        "actions": []
                    });
                }

                data.matches[count].actions.push({
                    "hero_action": row.hero_action,
                    "count": row.count
                });
            }
        }

        res.status(200);
        res.type('application/json');
        res.json(data);
    });
});

router.get("/players/:player_id/abilities", (req, res) => {
    let id = req.params.player_id;

    client.query(`SELECT players.id, COALESCE(nick, 'unknown') AS player_nick, 
                    heroes.localized_name AS hero_localized_name, matches.id AS match_id,
                    abilities.name AS ability_name, COUNT(au.ability_id) AS count, MAX(au.level) AS upgrade_level
                    
                    FROM players, (
                        SELECT mpd.id, hero_id, match_id 
                        FROM matches_players_details mpd
                        GROUP BY mpd.id HAVING player_id = ${id}
                    ) AS mpd
                    
                    LEFT JOIN heroes ON mpd.hero_id = heroes.id
                    LEFT JOIN matches ON mpd.match_id = matches.id
                    LEFT JOIN ability_upgrades au ON mpd.id = au.match_player_detail_id
                    LEFT JOIN abilities ON au.ability_id = abilities.id
                    
                    GROUP BY players.id, heroes.localized_name, matches.id, abilities.name HAVING players.id = ${id} ORDER BY matches.id`, (err, result) => {
        if (err){
            throw err;
        }

        let data;

        if(result.rows[0] === undefined){
            data = {
                "id": id,
                "player_nick": "unknown",
                "matches": []
            };
        }
        else{
            data = {
                "id": result.rows[0].id,
                "player_nick": result.rows[0].player_nick,
                "matches": []
            };

            let count = -1;
            let current = -1;

            for(let row of result.rows){
                if(row.match_id !== current){
                    count++;
                    current = row.match_id;

                    data.matches.push({
                        "match_id": row.match_id,
                        "hero_localized_name": row.hero_localized_name,
                        "abilities": []
                    });
                }

                data.matches[count].abilities.push({
                    "ability_name": row.ability_name,
                    "count": row.count,
                    "upgrade_level": row.upgrade_level
                });
            }
        }

        res.status(200);
        res.type('application/json');
        res.json(data);
    });
});

module.exports = router;
