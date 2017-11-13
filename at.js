const Airtable=require('airtable');
const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_TEST_BASE);

async function todaysArticles() {
  return new Promise((resolve, reject) => {
    base('Links').select({
      filterByFormula: `AND({Publish?}, IS_SAME(TODAY(), {publish_date}))`
    }).firstPage((err, records) => {
      if (err) {
        reject(err)
      } else {
        resolve(records || []);
      }
    })
  })
}

async function nextArticleForCourse(courseId, lastArticleId=-1) {
  lastArticleId = lastArticleId || -1;
  console.log("at.nextArticleForCourse: ", courseId, lastArticleId)
  let formula = `AND(AND({course_id} = ${courseId}, {ID} > ${lastArticleId}), {Publish?})`
  return new Promise((resolve, reject) => {
    base('Links').select({
      filterByFormula: formula,
      sort: [{field: "order", direction: "asc"}, {field: "ID", direction: "asc"}],
      maxRecords: 1
    }).firstPage((err, records) => {
      if (err) {
        reject(err)
      } else {
        resolve(records[0] || null);
      }
    })
  })
}

async function nextCourseId(lastCourseID) {
  lastCourseID = lastCourseID || -1;
  let formula = `AND({Publish?}, {id} > ${lastCourseID})`
  return new Promise((resolve, reject) => {
    base('courses').select({
      filterByFormula: formula,
      sort: [{field: "id", direction: "asc"}],
      maxRecords: 1
    }).firstPage((err, records) => {
        if (err) {
          reject(err)
        } else {
          resolve(records[0].fields.id || null);
        }
    })
  })
}

module.exports = { 
  todaysArticles,   
  nextArticleForCourse,
  nextCourseId
}