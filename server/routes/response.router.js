const express = require('express');
const { rejectUnauthenticated } = require('../modules/authentication-middleware');
const pool = require('../modules/pool');
const router = express.Router();

router.get('/by_office_action/:officeActionId', rejectUnauthenticated, (req, res) => {
    const { officeActionId } = req.params;
    let query;
    if (req.user && req.user.is_admin) {
        query = 
            `SELECT "response_text".* FROM "response_text"
            JOIN "issue" ON "issue"."id"="response_text"."issue_id"
            WHERE "issue"."office_action_id"=$1
            ORDER BY "response_text"."id";`;
    } else {
        query =
            `SELECT "response_text".* FROM "response_text"
            JOIN "issue" ON "issue"."id"="response_text"."issue_id"
            JOIN "office_action" ON "office_action"."id"="issue"."office_action_id"
            JOIN "application" ON "office_action"."application_id"="application"."id"
            WHERE "issue"."office_action_id"=$1 AND "application"."user_id"=${req.user.id}
            ORDER BY "id";`;
    }  
    pool.query(query, [officeActionId])
        .then((results) => {
            res.send(results.rows);
        }).catch((err) => {
            res.sendStatus(500);
            console.error('Error in GET /response_text/by_office_action', err);
        }
    );
});

router.post('/add', rejectUnauthenticated, (req, res) => {
    const query = 
        `INSERT INTO "response_text" ("issue_id", "text") 
        SELECT $1, $2
        WHERE EXISTS
            (SELECT * FROM "application"
            JOIN "office_action" ON "application"."id"="office_action"."application_id"
            JOIN "issue" ON "issue"."office_action_id"="office_action"."id"
            WHERE "application"."user_id"=$3 AND "issue"."id"=$1)
            OR $4;`;
    pool.query(query, [req.body.issue_id, req.body.text, req.user.id, req.user.is_admin])
        .then((results) => {
            res.sendStatus(201);
        }).catch((err) => {
            res.sendStatus(500);
            console.error('Error in POST /response_text', err);
        }
    );
});

router.put('/edit/:responseId', rejectUnauthenticated, (req, res) => {
    const { responseId } = req.params;
    const query =
        `UPDATE "response_text" SET "issue_id"=$1, "text"=$2 
        WHERE "response_text"."id"=$5
            AND (EXISTS
            (SELECT * FROM "application"
            JOIN "office_action" ON "application"."id"="office_action"."application_id"
            JOIN "issue" ON "issue"."office_action_id"="office_action"."id"
            WHERE "application"."user_id"=$3 AND "response_text"."id"=$5)
            OR $4);`;
    pool.query(
        query, [
            req.body.issue_id, 
            req.body.text, 
            req.user.id, 
            req.user.is_admin,
            responseId,
        ]).then((results) => {
            res.sendStatus(201);
        }).catch((err) => {
            res.sendStatus(500);
            console.error('Error in PUT /response_text', err);
        }
    );
});

router.delete('/delete/:responseId', rejectUnauthenticated, (req, res) => {    
    const query =
        `DELETE FROM "response_text"
        WHERE "response_text"."id"=$1
            AND (EXISTS
                (SELECT * FROM "application"
                JOIN "office_action" ON "application"."id"="office_action"."application_id"
                JOIN "issue" ON "issue"."office_action_id"="office_action"."id"
                JOIN "response_text" ON "response_text"."issue_id" = "issue"."id"
                WHERE ("application"."user_id"=$2 AND "response_text"."id" = $1))
            OR $3);`;
    pool.query(
        query, [
            req.params.responseId,
            req.user.id,
            req.user.is_admin,
        ]).then((results) => {
            res.sendStatus(201);
        }).catch((err) => {
            res.sendStatus(500);
            console.error('Error in DELETE /response_text', err);
        }
        );
});

module.exports = router;