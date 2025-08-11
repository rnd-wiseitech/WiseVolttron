// $(function(){
//     $(window).on('resize', function(){
//         $('.data-load').fadeIn();

//     });
//     $(window).on('resizeEnd', function(){
//         setTimeout(function() {
//             $('.data-load').fadeOut();
//         }, 400);

//     });

//     //page url 이동 loading

//     if($('.data-load').length){
//         setTimeout(function() {
//             $('.data-load').fadeOut();
//         }, 400);
//     }

//     setTimeout(function() {
//         if($('.main-section').length){
//             chartJsCustom();
//         }
//     }, 900);

//     // 로딩후 그림자박스 보여지기
//     $('.cont-box').css({top:40,opacity:0});
//     setTimeout(function() {
//         $('.cont-box').css({top:0,opacity:1});
//     }, 900);

//     // 메인 num counting
//     numcounting();

// });


// function numcounting(){
//     $('.count').each(function(){
//         var size = $(this).text().split(".")[1] ? $(this).text().split(".")[1].length : 0;
//         $(this).prop('Counter', 0).animate({
//             Counter: $(this).text()
//         },{
//             duration: 3000,
//             step: function (func) {
//                 $(this).text(parseFloat(func).toFixed(size));
//             }
//         });
//     });
// }
