const _ = require('underscore');
const manuscript = require('manuscript-api');
const db = require('./db');
let winston = require('winston');
const moment = require('moment');
const at = require('./at')

class Account {
  
  static async heartbeat() {
    // let accounts = await db.getHeartbeatAccounts(20, 1000 * 60 * 60 * 24);
    let accounts = await db.getHeartbeatAccounts(20);
    ///grab every account that we haven't already looked at today
    accounts.forEach(async account => {
      try {
        // this should never happen for this, integration
        if (account.last_heartbeat > Date.now) {
          return winston.log(`Skipping ${this.site} because it is rate limited.`)
        }
        let acc = new Account(account)
        await acc.publish();
        await db.setAccountFields(account.account_id, {last_heartbeat: Date.now()} )
      } catch(error) {
        winston.error(`Error handling heartbeat for account at ${account.account_id}: ${error}`);
      }
    })
  }
  
  constructor(account) {
    Object.assign(this, account)
  }
  
  async publish() {
    // Send daily article if there is one
    let articleSent = false;
    let manuscriptResponse;
    let todaysArticles = await at.todaysArticles();
    
    if (todaysArticles.length > 0) {
      todaysArticles.forEach(async article => {

        // Don't send this article if we've already sent it.  
        if (this.all_articles.includes(article.fields.ID)) {
          return;
        }

        manuscriptResponse = await this.publishArticle(article.fields.Name, article.fields.Description)
        if (manuscriptResponse.ixBug) {
          this.all_articles.push(article.fields.ID)
          await this.save()
          articleSent = true;
        }
      })
    }
    // Check if it has been a week since they last got a weekly article, and send one
    if (Date.now - this.lastWeeklyUpdate >= 7 * 24 * 60 * 60 * 1000) {
      try {
        let incompleteCourse = this.incompleteCourse();
        if (incompleteCourse) {
          let lastArticleForCourse = this.lastArticleForCourse(incompleteCourse.id)
          let nextArticleForCourse = await at.nextArticleForCourse(incompleteCourse.id, lastArticleForCourse)
          console.log(nextArticleForCourse)
          if (nextArticleForCourse) {
            manuscriptResponse = await this.publishArticle(nextArticleForCourse.fields.Name, nextArticleForCourse.fields.Description)
            if (manuscriptResponse.ixBug) {
              this.all_articles.push(nextArticleForCourse.fields.ID)
              incompleteCourse.articles.push(nextArticleForCourse.fields.ID)
              await this.save()
              articleSent = true;
            }
          }
          if (!nextArticleForCourse) {

            this.markCourseComplete(incompleteCourse.id)
            let bug = await this.publishFirstArticleForNextCourse();
            if (bug.ixBug) {
              articleSent = true
              return;
            }
          }
        }        
      } catch(error) {
        winston.error(`Error trying to publish next article in already started course for account ${this.url}`)
        // console.log(this)
        throw(error)
      }


      try {
        let nextCourseID = await this.nextCourse();
        if (nextCourseID) {

          let article = await at.nextArticleForCourse(nextCourseID);
          if (!article) {
            winston.info(`No remaining articles in courses for ${this.url}`);
            return;
          }
          manuscriptResponse = await this.publishArticle(article.fields.Name, article.fields.Description);
          if (manuscriptResponse.ixBug) {
            this.all_articles.push(article.fields.ID)
            this.courses.push({id: nextCourseID, articles:[article.fields.ID]})
            await this.save()
            articleSent = true;
          }
        }
      } catch(error) {
        winston.error(`Error trying to publish article for new course for account ${this.url}`)
        throw(error)
      }


      if (!articleSent) {
        this.publishOneOffArticle();
      }
      console.log('line 114')
              console.log(this)
      this.Last_weekly_update = Date.now();      
    }
    
  }
  
  incompleteCourse() {
    return _.find(this.courses, course => {
      return !course.complete;
    })
  }
  
  courseIDs() {
    if (!this.courses) {
      this.courses = [];
      this.save();
      return [];
    }
    
    return this.courses.map(course => {return course.id})
  }
  
  lastArticleForCourse(courseID) {
    let course = _.find(this.courses, course => {
      return course.id == courseID;
    })

    
    return _.last(course.articles.sort())
  }
  
  markCourseComplete(courseId) {

    let course = _.find(this.courses, course => {
      return course.id == courseId;
    })
    course.complete = true;
    this.save()
  }
  
  async publishFirstArticleForNextCourse() {
    let lastCourseID = _.last(this.courses.map(course => {
      return course.id;
    }).sort())
    let nextCourseID = await at.nextCourseId(lastCourseID || -1);
    let article = await at.nextArticleForCourse(nextCourseID, 0)
    
    this.courses.push({id: nextCourseID, articles: [article.ID], complete: false})
    
  }
  
  async nextCourse() {
    let courseIDs = this.courses.map(course => {
      return course.id
    })
    
    let lastCourseID
    if (courseIDs.length == 0) {
      lastCourseID = -1
    } else {
      lastCourseID = _.max(courseIDs)
    }
    let result = await at.nextCourseId(lastCourseID);
    return result
  }
  
  publishOneOffArticle() {
    
  }
  
  async publishArticle(title, html) {
    let mAPI = manuscript(this.url, this.token);
    let manuscriptApiIsValid
    try {
      manuscriptApiIsValid = await mAPI.isValid();
    } catch (error) {
      // If we get an error from the Manuscript API that's not an authentication issue, 
      // we want to log it and move on.
      winston.error(`Error accessing Manuscript API for account ${this.site}:  ${error}`);
      return;
    }

    // if (!manuscriptApiIsValid) { 
    //   console.log(manuscriptApiIsValid)
    //   return;
    // }
    console.log("about to publish")
    try{
      let manuscriptResponse = await mAPI.pushContent({sTitle: title, sHtml: html});
      return manuscriptResponse;
    }catch(error) {
      winston.error(error)
    }
  }

  async status() {
    try {
      let mAPI = manuscript(this.site, this.token);
      let manuscriptDataIsValid = await mAPI.isValid();
      if (manuscriptDataIsValid) {
        return "on";
      } else {
        return "error";
      }
    } catch (error) {
      winston.error(error);
      return "error";
    }
  }
  
  async save() {
    try{
      await db.setAccount(this);
      return true;
    }catch(error) {
      console.error(error);
      throw(error)
    }

  }
  
  
}

module.exports = Account;