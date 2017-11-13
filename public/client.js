// $(function() {

//   $('form').submit(function(e){
//     e.preventDefault;
//     getData();
//     return false;
//   })
  
  
//   var commentBoxMessages = {
//     noResponse: "Hmm... We weren't able to post to your activity feed.  This is often due to a typo in your account URL.  Please double check!",
//     noAccount: "Whoops!  We weren't able to find your Manuscript account.  Please double check that your account url is ",
//     badToken: "Hmm.  We found your account, but it doesn't look like your token is working.  Please double check and try again.",
//     unknownFailure: "Hmm... We weren't able to post to your activity feed.  Here's the message we got back from the server: "
//   }
  
//   function getData(authData) {
//     var account = $('#account').val();
//     var token = $('#token').val();
//     var ixBug = $('#ixBug').val();
//     var sTitle = $('#sTitle').val();
//     var sText = $('#sText').val();
    
//     var data = {account: account, token: token, ixBug: ixBug, sTitle: sTitle, sText: sText};
    
//     $.post('/push', data, response => {
//       console.log(response)
//       var text; 
//       var eventCommentClass;
//       console.log(response[0])
      
//       if (response.ixBug) {
//         var text = sText; 
//         eventCommentClass = "event-comment"
//       }

//       if (!response) {
//         text = commentBoxMessages.noResponse
//         eventCommentClass = "event-comment failure"
//       } else if(response[0] && response[0].message && response[0].message.includes("Account not found")) {
//         text = commentBoxMessages.noAccount + data.account
//         eventCommentClass = "event-comment failure"
//       } else if (response[0] && response[0].message && response[0].message.includes("Not logged in")) {
//         text = commentBoxMessages.badToken;
//         eventCommentClass = "event-comment failure";
//       } else if (response[0] && response[0].message) {
//         text = commentBoxMessages.unknownFailure + response[0].message
//         eventCommentClass = "event-comment failure"
//       }
      
//       addMessage(text, eventCommentClass);
      


//     });
//   }
  
//     function addMessage(text, eventCommentClass) {
//       $('#messages')
//         .append(($('<div/>', {class: 'event-body'}))
//         .append($("<img/>", {
//             src: 'https://cdn.glitch.com/b6a2fe4b-e1a7-452f-afc3-d2f9ac9417f3%2Fmanuscript-logo-mark.svg?1507919278027',
//             class: 'manuscript-logo'
//           }))
//         .append(($('<div/>', {class: eventCommentClass}))
//         .append($("<p/>").html(text))))
        
      
//       var arr = $('.event-body')
//       arr[arr.length - 1].scrollIntoView()
//     }

  
// });

