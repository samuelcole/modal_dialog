(function ($) {
  /*
   * Makes a link open a modal dialog.
   *
   * The HTML must look like this:
   *
   * <a class="modal_dialog_invoker" href="/fallback/when/no/js">
   *   Click here to open a dialog
   * </a>
   * <div class="modal_dialog" style="display: none;">
   *   <div class="modal_dialog_ie6_background"></div>
   *   <div class="modal_dialog_outer">
   *     <div class="modal_dialog_sizer">
   *       <div class="modal_dialog_inner">
   *         <div class="modal_dialog_content">
   *         ...dialog contents ...
   *         </div>
   *       </div>
   *       <span class="modal_dialog_ie_hack"></span>
   *     </div>
   *   </div>
   * </div>
   *
   * (Yes, all those divs are truly necessary for cross-browser styling.)
   *
   * Then, make this link into a modal dialog like this:
   *
   * $('a.modal_dialog_invoker').click(function() {
   *   $(this).next('div.modal_dialog').modal_dialog();
   * });
   *
   * When modal_dialog() is called, the element will be moved to the end of
   * the <body>.
   *
   * All styling and event handling are beyond the scope of this module. For
   * instance, to position the dialog, set CSS styles on its <div> element; to
   * set a transparent overlay on the entire page excepting the dialog, write
   * the outer and inner <div>s and position them through CSS. Ideally, your
   * site will have some generic "dialog" HTML which will surround all
   * dialogs.
   *
   * EVENTS
   * - close.modal_dialog: when called on the <div> above, will close the
   *                       dialog.
   * - modal_dialog:opened: called when the <div> above is opened. Passed the
   *                        "event" argument (see OPTIONS).
   * - before_close.modal_dialog: called before the <div> above is closed. Passed the
   *                        "event" argument (see OPTIONS).
   * - closed.modal_dialog: called when the <div> above is closed. Passed the
   *                        "event" argument (see OPTIONS).
   * - prevent_close.modal_dialog: when called on the <div> above, hides the
   *                               "close" link and prevents closing.
   * - allow_close.modal_dialog: reverts the effects of prevent_close.
   *
   * OPTIONS
   * - close_link: element(s) which, when clicked, should close the dialog.
   *               defaults to all "a.modal_dialog_close"s in the dialog, plus
   *               the dialog itself, minus its contents.
   * - prevent_close: if true, calling close() will not close the modal dialog.
   * - event: the event which opened this modal dialog.
   * - scroll_margin: if we are in "scrolling mode" (i.e., the dialog is taller
   *                  than the screen), margin (in px) to show on the top and
   *                  bottom of the dialog. (default: 20)
   */

  function ModalDialog($elem, options) {
    this.$elem = $elem;

    this.$close_a = $elem.find('a.modal_dialog_close');
    var $outer = $elem.children(),
      $sizer = $outer.children(),
      $inner = $sizer.children(),

      $close_link = $elem.add($outer).add($sizer).add($inner).add(this.$close_a);

    this.options = $.extend({
      close_link: $close_link,
      scroll_margin: 20,
      ignore_parent: false,
      prevent_close: false
    }, options);

    this.prevent_close = this.options.prevent_close;
    if (this.prevent_close) {
      this.$close_a.hide();
    }

    if (!this.options.ignore_parent) {
      this._bind_parent_modal();
    }
    this._remember_original_css();
    this._attach();
  }

  $.fn.modal_dialog = function (options) {
    options = options || {};
    return $(this).each(function () {
      var md = $(this).data('modal_dialog');
      if (!md) {
        md = new ModalDialog($(this), options);
        $(this).data('modal_dialog', md);
      }
      md.open(options.event);
    });
  };

  // Map of seen remote dialogs to their ModalDialog objects
  window.seen_remote_urls = {};

  $.create_modal_dialog = function (title, body, options) {
    options = options || {};

    if (title.length) {
      //we don't want to create an empty h4 if there is no title
      title = '<h4>' + title + '</h4>';
    }

    var $modal = $('<div class="modal_dialog"' + (options.id !== undefined ? (' id="' + options.id + '" ') : ' ') + 'style="display: none;">' +
      '<div class="modal_dialog_ie6_background"></div>' +
      '<div class="modal_dialog_outer">' +
        '<div class="modal_dialog_sizer">' +
          '<div class="modal_dialog_inner">' +
            '<div class="modal_dialog_content">' +
              '<div class="modal_dialog_head">' +
                title +
                '<a class="modal_dialog_close" href="#"><span class="icon-x">Close</span></a>' +
              '</div>' +
              '<div class="modal_dialog_body">' +
              body +
              '</div>' +
            '</div>' +
          '</div>' +
          '<span class="modal_dialog_ie_hack"></span>' +
        '</div>' +
      '</div>' +
      '</div>'),

      md;

    $('body').append($modal);

    md = new ModalDialog($modal, options);

    $modal.data('modal_dialog', md);

    return $modal;
  };


  function return_modal_dialog_from_remote(remote_url, options) {
    var md,
      $modal = $([]);

    $.each(window.seen_remote_urls, function (seen_url) {
      if (url_equals(remote_url, seen_url, {include_query: true})) {
        md = this;
      }
    });

    if (!md) {
      $modal = $.create_modal_dialog(options.title || '', 'spinner', options);
      $modal.addClass('spinning');
      md = $modal.data('modal_dialog');

      md.remote_xhr = $.ajax({
        url: remote_url,
        type: 'get',
        dataType: options.dataType,
        beforeSend: options.beforeSend,
        success: function (data) {
          var $contents = $(data);
          (options.remote_modal_dialog_contents_loaded || F).apply(this, [$contents, options, remote_url ]);
          $modal.find('.modal_dialog_body').html($contents);
          $modal.removeClass('spinning');
          $modal.trigger('size_change');
          $modal.trigger('modal_dialog:remote_dialog_loaded');
        },
        error: function () {
          $modal.trigger('modal_dialog:errored', arguments);
          $modal.remove();
          delete window.seen_remote_urls[remote_url];
        }
      });

      md.remote_url = remote_url;

      if (!options.do_not_cache) {
        window.seen_remote_urls[remote_url] = md;
      }
    }

    return md;
  }

  window.F = function () { }; //no-op

  $.open_remote_modal_dialog = function (remote_url, options) {
    options = options || {};
    var md = return_modal_dialog_from_remote(remote_url, options);
    md.open(options.event);
    return md;
  };



  $.extend(ModalDialog.prototype, {
    _attach: function () {
      var _this = this,
        $close_link = $(this.options.close_link);


      this.$elem.bind('close.modal_dialog', function () { _this.close(); });
      this.$elem.bind('size_change.modal_dialog', function () { _this._on_size_changed(); });
      this.$elem.bind('prevent_close.modal_dialog', function () { _this._set_prevent_close(true); });
      this.$elem.bind('allow_close.modal_dialog', function () { _this._set_prevent_close(false); });
      $(window).bind('resize.modal_dialog', function () { _this._on_size_changed(); });

      $close_link.bind('click.modal_dialog', function (e) {
        if ($close_link.index(e.target) !== -1) {
          _this.close(e);
          e.preventDefault();
        }
      });

      this.$elem.keypress(function (e) {
        if (e.keyCode === 0x1b) {
          // Escape
          _this.close(e);
          e.preventDefault();
        }
      });
    },

    _detach: function () {
      $(this.options.close_link).unbind('click.modal_dialog');
      this.$elem.unbind('size_change.modal_dialog');
      $(window).unbind('resize.modal_dialog');
    },

    _bind_parent_modal: function () {
      this.$parent_modal = $([]);
      this.$elem.bind('before_close.modal_dialog', function () {
        $(this).data('modal_dialog').$parent_modal.show();
        $(this).data('modal_dialog').$parent_modal = $([]);
      });
    },

    _on_size_changed: function (opening) {
      var $inner = this.$elem.find('div.modal_dialog_inner');
      if ($inner.height() > this._get_viewport_height()) {
        this._resize_to_position_absolute(opening);
      } else {
        this._resize_to_position_fixed();
      }
    },

    _resize_to_position_fixed: function () {
      this._apply_original_css();
    },

    // For when position: fixed would lead to an un-scrollable dialog, we instead
    // show the dialog at the current position and let the user scroll down. The
    // whole situation is quite confusing, code-wise.
    _resize_to_position_absolute: function (opening) {
      if ($.browser.msie && $.browser.version < '7') {
        this.$elem[0].style.removeExpression('top');
        this.$elem[0].style.removeExpression('height');
      }

      var body_height = $('body').height(),

        // One of <body> or <html> will have a non-zero scrollTop if scrolled
        // (safari: body, ie/ff: html)
        scroll_top = $('body')[0].scrollTop + $('html')[0].scrollTop,

        $inner = this.$elem.find('div.modal_dialog_inner'),
        inner_height = $inner.height(),
        margin = this.options.scroll_margin,

        min_page_height = scroll_top + inner_height + margin * 2,
        page_height = min_page_height > body_height ? min_page_height : body_height,

        margin_bottom = page_height - scroll_top - inner_height - (margin * 2),

        was_absolute = this.$elem.css('position') === 'absolute';

      this.$elem.css('position', 'absolute');
      this.$elem.css('top', '0');
      this.$elem.css('height', page_height);
      if (!was_absolute || opening) {
        $inner.css('margin-top', scroll_top + margin);
        $inner.css('margin-bottom', margin_bottom);
      }
    },

    _remember_original_css: function () {
      this._elem_original_css = {};
      this._inner_original_css = {};

      var $inner = this.$elem.find('div.modal_dialog_inner'),
        elem_props = ['position', 'top'],
        inner_props = ['margin-top', 'margin-bottom'],
        _this = this;

      $.each(elem_props, function (i) {
        var prop = elem_props[i];
        _this._elem_original_css[prop] = _this.$elem.css(prop);
      });

      $.each(inner_props, function (i) {
        var prop = inner_props[i];
        _this._inner_original_css[prop] = $inner.css(prop);
      });
    },

    _get_viewport_height: function () {
      if ($.browser.msie) {
        return window.document.documentElement.clientHeight;
      } else {
        return window.innerHeight;
      }
    },

    _apply_original_css: function () {
      var prop,
        value,
        $inner = this.$elem.find('div.modal_dialog_inner');

      for (prop in this._elem_original_css) {
        if (this._elem_original_css.hasOwnProperty(prop)) {
          value = this._elem_original_css[prop];
          this.$elem.css(prop, value);
        }
      }

      for (prop in this._inner_original_css) {
        if (this._inner_original_css.hasOwnProperty(prop)) {
          value = this._inner_original_css[prop];
          $inner.css(prop, value);
        }
      }

      if ($.browser.msie && $.browser.version < '7') {
        // setExpression() doesn't take effect immediately, sometimes
        this.$elem[0].style.top = document.documentElement.scrollTop;
        this.$elem[0].style.setExpression('top', 'eval(document.documentElement.scrollTop)');
        this.$elem[0].style.height = document.documentElement.clientHeight;
        this.$elem[0].style.setExpression('height', 'eval(document.documentElement.clientHeight)');
      } else {
        this.$elem.css('height', '100%');
      }
    },

    _set_prevent_close: function (prevent_close) {
      this.prevent_close = prevent_close;
      if (prevent_close) {
        this.$close_a.hide();
      } else {
        this.$close_a.show();
      }
    },

    open: function (e) {
      var $body = this.$elem.parents('body');

      if ($body.length) {
        $body.append(this.$elem);
      }

      if (!this.options.ignore_parent) {
        this.$parent_modal = $('.modal_dialog:visible');
        this.$parent_modal.hide();
      }

      this.$elem.show();
      this._on_size_changed(true);

      this.$elem.trigger('modal_dialog:opened', [e]);

      this._attach();
    },

    close: function (e) {
      if (this.prevent_close) {
        return;
      }
      this.$elem.trigger("before_close.modal_dialog", [e]);

      if (e && e.isDefaultPrevented()) {
        return;
      }

      this._detach();

      if (this.options.do_not_cache) {
        this.$elem.remove();
      } else {
        this.$elem.hide();
      }

      this.$elem.trigger("closed.modal_dialog", [e]);
    }
  });

  $.modal_confirm = function (callback, options) {
    var defaults = {
        message: 'Do you really want to do this?',
        confirm_text: 'Confirm',
        cancel_text: 'Cancel',
        title: 'Are you sure?'
      },
      html,
      $confirm_dialog,
      md;

    options = $.extend({}, defaults, options);
    html = "<div style=\"max-width:600px;\">" + options.message + "<p class='clearfix'>" + "<a class='confirm button-neutral left' href='#'>" + options.confirm_text + "</a>" + "<a class='cancel button-space left' href='#'>" + options.cancel_text + "</a></p></div>";
    $confirm_dialog = $.create_modal_dialog(options.title, html);
    md = $confirm_dialog.data('modal_dialog');

    $confirm_dialog.find('.cancel').click(function (e) {
      e.preventDefault();
      md.close();
    });

    $confirm_dialog.find('.confirm').click(function (e) {
      e.preventDefault();
      callback();
      md.close();
    });

    md.open();
  };

}(jQuery));
