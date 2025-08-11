$(document).ready(function(){
    userAgentCheck();
    layoutSystem();
    treeMenuUi();
    inputUi();
    tabUi();
    fileTabLimet();
    resizePanel();

   

    if($('.modal').length){
        modalUi();
        modalSampleScript();
    }

    setTimeout(function() {
        // alert('aaaaaa');
        $('.scrollbar').scrollbar();
        if($('.datepicker').length){
            libDatepicker();
        }
    }, 100);

});

$(window).on('resize',function(){
    resizePanel();
}).trigger('resize');


function resizePanel() {
    
    const resizableMaxHeight = window.innerHeight - 300;
    $(".resizable-vertical").resizable({
       handles : 's',
       // maxWidth: 500,
       // minWidth: 0,
       maxHeight: resizableMaxHeight,
       minHeight: 300,
   })
}

function fileTabLimet(){
    // click CUSTOM event
    $('.type-file').each(function(){
        $(this).find('.fileTabAdd').on('click',function(e){
            e.preventDefault();

            // Variable
            var fileTab = $(this).parents('.type-file').find('.tab-length');
            var fileTabItem = fileTab.find('li');
            var fileTabItemLength = fileTabItem.length;
            var fileTabItemLengthDefault = fileTabItemLength + 1;

            // tab Item CREATE
            var createTab='';
                createTab+='<li><a href="#" class="name"><span>reportName</span></a><a href="#" class="ico close">close</a></li>';
            fileTab.append(createTab);

            // this Item REMOVE button
            fileTab.find('.close').on('click', function(e){
                e.preventDefault();
                $(this).parents('li').remove();
            });

            // this Item AUTO LAYOUT
            if(fileTabItem.length > 2){
                $('.tab-length li').outerWidth(100 / fileTabItemLengthDefault + '%');
            }

            clickStatus();
        });

    });

    // click STATUS event
    function clickStatus(){
        $('.tab.type-file .tab-length li').on('click',function(){
            $(this).addClass('on').siblings().removeClass('on');
        });
    }
}
function inputUi(){
    $('.switch').each(function(){
        $(this).on('click', function(){
            if ($(this).hasClass('on')) {
                $(this).removeClass('on');
                $(this).find('input').attr('checked', false);
                return false;
            }else {
                $(this).addClass('on');
                $(this).find('input').attr('checked', true);
                return false;
            }
        });
    });

    $('.visibility').on('click', function(){
        var passwordField = $(this).prev('input');
        var passwordFieldType = passwordField.attr('type');
        if(passwordFieldType == 'password'){
            passwordField.attr('type', 'text');
            $(this).attr('class',"ico visibility");
        } else {
            passwordField.attr('type', 'password');
            $(this).attr('class',"ico visibility on");
        }
    });

}

function libDatepicker(){
    $('.datepicker').datepicker({
        dateFormat: 'yy-mm-dd',
        showMonthAfterYear: true,
        yearSuffix: '년',
        altFormat: "yy-mm-dd(DD)",
        dayNamesMin : ['일','월','화','수','목','금','토'],
        monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
        dayNames: ['일','월','화','수','목','금','토'], // 요일 텍스트 설정
        dayNamesShort: ['일','월','화','수','목','금','토'], // 요일 텍스트 축약 설정&nbsp;
        firstDay: 1,//  0: 일요일 부터 시작, 1:월요일 부터 시작
        // showOn:"button",
    });
}

function treeMenuUi(){
    var dropAnc = $('.drop-down li > a');
    dropAnc.each(function(){
        // 드롭다운 할 내용이 있는 item
        var dataUse = $(this).next('.dep');

        // focus
        $(this).on('click',function(){
            $(this).addClass('on').parents('li').siblings().find('a').removeClass('on');
            $(this).parents('li').find('>a').addClass('on');
        });


        if(dataUse.length){
            $(this).addClass('arrow');
            $(this).on("click", function(e){
                e.preventDefault();
                $(this).parent().find('>.dep').slideToggle().parent('li');
                $(this).parent().find('>.dep').parent('li').toggleClass('active');
            });
        }
    });
}


function userAgentCheck(){
    var ua = window.navigator.userAgent;
    var other = 999;
    var msie = ua.indexOf('MSIE ');

    if(ua.indexOf('Mobile') != -1){
        $('html').addClass('mobile');
    }

    if(ua.toLowerCase().indexOf('safari') != -1){
        if(ua.toLowerCase().indexOf('chrome') != -1){
            $('html').addClass('chrome');
        } else {
            $('html').addClass('safari');
        }
    } else if(ua.toLowerCase().indexOf('firefox') != -1){
        $('html').addClass('firefox');
    } else if(ua.toLowerCase().indexOf('msie') != -1){
        $('html').addClass('ie');
    }

    if( ua.toLowerCase().indexOf('os x') != -1 ){
        $('html').addClass('ios');
    } else if( ua.toLowerCase().indexOf('Android') != -1 ){
        $('html').addClass('android');
    }
}

function layoutSystem(){
    // table
    $('.tbl-scroll').each(function(){
        var thisColgroup = $(this).find('.scrollhead table colgroup').clone();
        $(this).find('.scrollbody table').prepend(thisColgroup);
    });

    // app grid
    var countNum = $('.row'),
        classNum = countNum.length;
    for (var i = 0; i < classNum; i++) {
        var classCount = 'col-' + countNum.eq(i).find('>.column').length;
        countNum.eq(i).addClass(classCount);
    }

    // panel
    var panelNum = $('.panel-app'),
        panelClassNum = panelNum.length;
    for (var i = 0; i < panelClassNum; i++) {
        var panelClassNum = 'col-' + panelNum.eq(i).find('.panel-grid').length;
        panelNum.eq(i).addClass(panelClassNum);
    }

    $('.panel').each(function(){
        if($(this).find('.panel-head').length){
            $(this).find('.scrollbar').addClass('usehead');
        }
    });

    if($('.type-header').length){
        $('.viewport').addClass('hasTab');
    }


}

function modalUi(){
    $('.modal').each(function(){
        var layerResize = $(window).height();
        var layerHeight = $(this).outerHeight();
        $(this).css({
            marginTop : -layerHeight/2
        });
    });
}

function tabUi(){
    var tabTit = $('.page-tab-ui'),
        tabBtn = tabTit.find('li');

    var tabCnt = $('.tab-content'),
        tabIdx = tabCnt.index();

    // load style settings
    tabCnt.not(':eq('+tabIdx+')').hide();
    tabTit.each(function(){
        var defaultTit = $(this).children('li').eq(0);
        defaultTit.addClass('on');
    });
    $('.tab-component').each(function () {
        var defaultCnt = $(this).children('.tab-content').eq(0);
        defaultCnt.addClass('on').show();
    });

    tabBtn.on('click', function(e){
        if($(this).attr('rel')){
            e.preventDefault();

            var $this = $(this),
                thisRel = $this.attr('rel');
                thisClass = $('.'+ thisRel);
                thisText = $this.text();
                target = thisClass.parent('.tab-component').attr('id');

            // content connect
            $('#' + target +  '>.tab-content').hide().removeClass('on');
            $('#' + target + ' .' + thisRel).show().addClass('on');

            // title styling and attr status
            $this.addClass('on').siblings().removeClass('on');
            thisClass.addClass('on').siblings().removeClass('on');
            $this.find('a').addClass('active').parents('li').siblings().find('a').removeClass('active');
            $this.find('a').attr('title', thisText + 'tab active').parent().siblings().find('a').attr('title','');
        }
    });
}

function modalSampleScript(){
    $('.modal').hide();
    $('.modalLoad').on('click',function(e){
        e.preventDefault();
        $('html').addClass('overflow');
        var $self = $(this);
        var $target = $($(this).attr('href'));
        var $targetId = $target.attr('id');

        $target.show();
        setTimeout(function() {
            $target.find('.modal-dim').addClass('on');
            $target.addClass('on');
        }, 100);

        modalUi();

        // close and focusout
        var isVisible = $target.is(':visible');
        var modalLength = $('.modal:visible').length;

        $target.find(".modalClose").on('click',function(e){
            e.preventDefault();

            $target.find('.modal-dim').removeClass('on');
            $target.removeClass('on');
            setTimeout(function() {
                $('html').removeClass('overflow');
                $target.hide();
            }, 300);

            $(this).off('click');
            if (isVisible) {
                if (modalLength > 1) {
                    $target.fadeOut(250);
                    $('html').removeClass('overflow');
                } else {
                    removeDim();
                }
            }
        });
    });
}

function iptFile(){
    var fileTarget = $('.ipt-file .ipt-hidden');
    fileTarget.on('change', function(){
        if(window.FileReader){
            var filename = $(this)[0].files[0].name;
        }else{
            var filename = $(this).val().split('/').pop().split('\\').pop();
        }

            $(this).siblings('.ipt-like-file').val(filename);
    });
}
