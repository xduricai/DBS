const express = require("express");
const router = express.Router();
const { client } = require("./database.js");

router.get("/matches/:match_id/top_purchases", (req,res) => {
    let id = req.params.match_id;

    client.query(`
        SELECT rankings.hero_id, rankings.hero_name, rankings.item_id, rankings.item_name, rankings.buy_count AS count 
        FROM (
            SELECT hero_id, heroes.localized_name AS hero_name, items.id AS item_id, items.name AS item_name, COUNT(items.name) AS buy_count, 
            ROW_NUMBER() OVER (PARTITION BY hero_id ORDER BY hero_id ASC,  COUNT(items.name) DESC, items.name ASC) rn
            FROM matches_players_details mpd
            LEFT JOIN purchase_logs pl ON mpd.id = match_player_detail_id
            LEFT JOIN items ON pl.item_id = items.id
            LEFT JOIN heroes ON hero_id = heroes.id
            LEFT JOIN matches ON match_id = matches.id
            WHERE match_id = ${id} AND (
                (matches.radiant_win = TRUE AND player_slot >= 0 AND player_slot <= 4) OR 
                (matches.radiant_win = FALSE AND player_slot >= 128 AND player_slot <= 132))
            GROUP BY hero_id, heroes.localized_name, items.id
        ) AS rankings
        WHERE (rankings.rn >= 1 AND rankings.rn <= 5)
        ORDER BY rankings.hero_id ASC, rankings.buy_count DESC, rankings.item_name ASC`, (err, result) => {

        if (err){
            throw err;
        }

        let data = {
            "id": id,
            "heroes": []
        };

        if(result.rows[0] !== undefined){
            let current = null;
            let count = -1;

            for(let row of result.rows){
                if(row.hero_id !== current){
                    current = row.hero_id;
                    count++;

                    data.heroes.push({
                       "id": row.hero_id,
                       "name": row.hero_name,
                       "top_purchases": []
                    });
                }
                data.heroes[count].top_purchases.push({
                    "id": row.item_id,
                    "name": row.item_name,
                    "count": row.count
                });
            }
        }

        res.status(200);
        res.type("application/json");
        res.json(data);
    });
});

router.get("/abilities/:ability_id/usage", (req,res) => {
    let id = req.params.ability_id;

    client.query(`
        SELECT abilities.name AS ability_name, counts.hero_id, heroes.localized_name AS hero_name, counts.winner, counts.bucket, counts.count 
        FROM(
            SELECT *, COUNT (*), MAX(COUNT (*)) OVER (PARTITION BY usages.hero_id, usages.winner)
            FROM(
                SELECT mpd.hero_id,
                CASE
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 10) THEN '0-9'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 10 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 20) THEN '10-19'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 20 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 30) THEN '20-29'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 30 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 40) THEN '30-39'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 40 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 50) THEN '40-49'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 50 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 60) THEN '50-59'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 60 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 70) THEN '60-69'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 70 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 80) THEN '70-79'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 80 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 90) THEN '80-89'
                WHEN ((CAST(au.time AS float)/CAST(matches.duration AS float)*100) >= 90 AND (CAST(au.time AS float)/CAST(matches.duration AS float)*100) < 100) THEN '90-99'
                ELSE '100-109'
                END AS bucket,
                CASE
                WHEN ((mpd.player_slot >= 0 AND mpd.player_slot <= 4 AND matches.radiant_win = TRUE)
                OR (mpd.player_slot >= 128 AND mpd.player_slot <= 132 AND matches.radiant_win = FALSE))
                THEN TRUE
                ELSE FALSE
                END AS winner
                FROM ability_upgrades au
                LEFT JOIN matches_players_details mpd ON au.match_player_detail_id = mpd.id
                LEFT JOIN matches ON mpd.match_id = matches.id
                WHERE au.ability_id = ${id}
            ) AS usages
            GROUP BY usages.hero_id, usages.bucket, usages.winner
            ORDER BY usages.winner DESC, count DESC
        ) AS counts
        LEFT JOIN heroes ON counts.hero_id = heroes.id
        LEFT JOIN abilities ON ${id} = abilities.id
        WHERE counts.count = counts.max
        ORDER BY hero_id`, (err, result) => {

        if (err){
            throw err;
        }

        let data = {
            "id": id,
            "name": null,
            "heroes": []
        };

        if(result.rows[0] !== undefined){
            let count = -1;
            let current = "";

            data.name = result.rows[0].ability_name;

            for(let row of result.rows) {
                if(current !== row.hero_name){
                    current = row.hero_name;
                    count++;

                    data.heroes.push({
                        "id": row.hero_id,
                        "name": row.hero_name,
                        "usage_winners": {},
                        "usage_loosers": {}
                    });
                }
                if(row.winner){
                    data.heroes[count].usage_winners.bucket = row.bucket;
                    data.heroes[count].usage_winners.count = row.count;
                }
                else{
                    data.heroes[count].usage_loosers.bucket = row.bucket;
                    data.heroes[count].usage_loosers.count = row.count;
                }
            }
        }

        res.status(200);
        res.type("application/json");
        res.json(data);
    });
});

module.exports = router;