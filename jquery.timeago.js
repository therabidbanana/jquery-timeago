/*
 * timeago: a jQuery plugin, version: 0.9.3.dtime (2011-09-19)
 * @requires jQuery v1.2.3 or later
 *
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Licensed under the MIT:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright (c) 2008-2011, Ryan McGeary (ryanonjavascript -[at]- mcgeary [*dot*] org)
 */
(function($) {
  $.timeago = function(timestamp, settings) {
    if (typeof timestamp == "string") timestamp = $.timeago.parse(timestamp);
    else if (!timestamp instanceof Date) timestamp = $.timeago.datetime(timestamp);
    return inWords(timestamp, $.extend(true, {}, $t.settings, settings));
  };
  var $t = $.timeago;
  var intervalId = null;
  var elements = [];

  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowFuture: false,
      countdownCutoff: false,
      countupCutoff: false,
      fireThresholds: false,
      thresholds: [0],
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        numbers: []
      }
    },
    inWords: function(distanceMillis, settings) {
      var distance_seconds = ~~(distanceMillis / 1000);
      var $s = settings
      var $l = $s.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if ($s.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
        distanceMillis = Math.abs(distanceMillis);
      }

      var seconds = distanceMillis / 1000;
      var minutes = seconds / 60;
      var hours = minutes / 60;
      var days = hours / 24;
      var years = days / 365;

      


      if( shouldCountdown(distance_seconds, $s) ){
        return inCountdown(distance_seconds, $s);
      }
      else if ( shouldCountup(distance_seconds, $s)) {
        return inCountup(distance_seconds, $s);
      }

      function substitute(stringOrFunction, number) {
        var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
        var value = ($l.numbers && $l.numbers[number]) || number;
        return string.replace(/%d/i, value);
      }

      var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute($l.minute, 1) ||
        minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute($l.hour, 1) ||
        hours < 24 && substitute($l.hours, Math.round(hours)) ||
        hours < 36 && substitute($l.day, 1) ||
        days < 30 && substitute($l.days, Math.round(days)) ||
        days < 60 && substitute($l.month, 1) ||
        days < 365 && substitute($l.months, Math.floor(days / 30)) ||
        years < 2 && substitute($l.year, 1) ||
        substitute($l.years, Math.floor(years));

      return $.trim([prefix, words, suffix].join(" "));
    },
    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d\d\d+/,""); // remove milliseconds
      s = s.replace(/-/,"/").replace(/-/,"/");
      s = s.replace(/T/," ").replace(/Z/," UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
      return new Date(s);
    },
    datetime: function(elem) {
      // jQuery's `is()` doesn't play well with HTML5 in IE
      var isTime = $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
      var iso8601 = isTime ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    }
  });

  $.fn.timeago = function(settings) {
    var self = this;
    var $s = $.extend(true, {}, $t.settings, settings);
    self.data("timeago", { settings: $s });
    
    self.each(function (i, element) {
        if ($.inArray(element, elements) == -1)
            elements.push(element);
    });
    $.each(elements, refresh);

    if ($s.refreshMillis > 0) {
      setTimeout(function() { $.each(elements, refresh); }, $s.refreshMillis);
    }
    return self;
  };

  function refresh() {
    var data = prepareData(this);

    
    if (data && !isNaN(data.datetime)) {
      var new_distance = distance(data.datetime);
      if(data.settings.fireThresholds && !isNaN(data.last_distance)){
        firePassedThresholds(data.last_distance, new_distance, this, data.settings)
        data.last_distance = new_distance;
        $(this).data('timeago', data);
      }
      else if(data.settings.fireThresholds){
        data.last_distance = new_distance;
      }
      $(this).text(inWords(data.datetime, data.settings));
      setTimeout($.proxy(refresh, this), data.settings.refreshMillis);
    }
    return this;
  }

  function inCountdown(distance_seconds, settings){
    var clock = distanceClock(distance_seconds, settings);
    return "-"+clock[0]+":"+clock[1]+":"+clock[2]+"";
  }

  function inCountup(distance_seconds, settings){
    var clock = distanceClock(distance_seconds, settings);
    return "+"+clock[0]+":"+clock[1]+":"+clock[2]+"";
  }


  function distanceClock(distance_seconds, settings){
    var hours, minutes, seconds, rem;
    var str_hr, str_min, str_sec;
    str_hr = str_min = str_sec = "0";
    rem = Math.abs(distance_seconds);
    hours = ~~(rem / (60*60));
    rem = (rem % (60*60));
    minutes = ~~(rem / 60);
    rem = (rem % 60);
    seconds = rem;
    str_hr = (hours > 9 ? hours.toString() : (str_hr + hours));
    
    str_min = (minutes > 9 ? minutes.toString() : (str_min + minutes));
    str_sec = (seconds > 9 ? seconds.toString() : (str_sec + seconds));
    return [str_hr, str_min, str_sec];
  }


  function shouldCountdown(distance_seconds, settings){
    return settings.countdownCutoff &&
      distance_seconds <= 0 &&
      Math.abs(distance_seconds) < settings.countdownCutoff;
  }

  function shouldCountup(distance_seconds, settings){
    return settings.countupCutoff &&
      distance_seconds >= 0 &&
      distance_seconds < settings.countupCutoff;
  }


  function prepareData(element) {
    if(element === null || typeof element == "undefined"){
      return null;
    }
    element = $(element);
    var data = element.data("timeago");
    if (data && !data.datetime) {
      data = $.extend(true, {}, data, { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      element.data("timeago", data)
      if (text.length > 0) {
        element.attr("title", text);
      }
    }
    return data;
  }

  // Last, current == distance in millis
  // list of thresholds == distance in seconds
  function firePassedThresholds(last, current, element, settings){
    $.each(settings.thresholds, function(i, e){
      var thresh = e*1000;
      if(last > thresh && current > thresh) return;
      if(last < thresh && current < thresh) return;

      $(element).trigger('timeago:threshold', e);
    })
  }

  function inWords(date, settings ) {
    return $t.inWords(distance(date), settings);
  }

  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }

  // fix for IE6 suckage
  document.createElement("abbr");
  document.createElement("time");
}(jQuery));


