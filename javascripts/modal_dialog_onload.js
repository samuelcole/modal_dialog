$(function () {

  /*
   * For a <div class="modal_dialog" id="some_funky_dialog">, ensure that every
   * <a href="link_to_some_funky_dialog"> calls modal_dialog() on it.
   */
  $('.modal_dialog').each(function () {
    var $dialog = $(this),
      dialog_id = $dialog.attr('id');
    $('a.link_to_' + dialog_id).live("click", function (e) {
      $dialog.modal_dialog({ event: e });
      e.preventDefault();
    });
    if ($dialog.closest('.pop_modal_on_load').length) {
      $dialog.modal_dialog();
    }
  });

  $('a.remote_modal_dialog').live('click', function (e) {
    e.preventDefault();
    if ($(this).is('.disabled')) { return; }
    var md = $.open_remote_modal_dialog(
      $(this).attr('href'),
      {
        title: $(this).attr('data-modal-title'),
        remote_modal_dialog_contents_loaded: function ($contents, options, remote_url) {
          var $move_to_head = $contents.find('.move_to_head');
          if ($move_to_head.length) {
            $('head').append($move_to_head.children());
            $move_to_head.remove();
            delete window.seen_remote_urls[remote_url];
          }
        },
        dataType: 'html', 
        beforeSend: function (xhr) {
          xhr.setRequestHeader("Accept", "text/javascript, */*");
        }
      }
    );
    $(this).data('modal_dialog', md);
    md.$elem.bind('modal_dialog:remote_dialog_loaded', function () {
      if (FB && FB.XFBML) {
        FB.XFBML.parse();
      }
    });
  });

  $('a.modal_dialog_close').live('click', function (e) {
    e.preventDefault();
    $(this).trigger('close.modal_dialog');
  });

  /*
   * If the page was loaded at hash "#modal_dialog:whatever_modal_dialog", open
   * that modal dialog.
   */
  var hash_regex = /^#modal_dialog:([\-_a-zA-Z0-9]+)$/,
    remote_hash_regex = /^#remote_modal_dialog:(.*)$/,
    hash_match = hash_regex.exec(window.location.hash),
    remote_hash_match = remote_hash_regex.exec(window.location.hash),
    dialog_id;
  if (hash_match) {
    dialog_id = hash_match[1];
    $('#' + dialog_id).modal_dialog();
    window.location.replace('#');
  }
  if (remote_hash_match) {
    $('a.remote_modal_dialog').each(function () {
      if (url_equals(decodeURIComponent(remote_hash_match[1]), $(this).attr('href'))) {
        //this sucks
        $(this).click();
      }
    });
    window.location.replace('#');
  }

});
