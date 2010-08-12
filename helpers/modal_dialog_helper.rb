module ModalDialogHelper
  def render_modal_dialog(html_id, header = nil, options = {}, &block)
    # only render modal dialogs with a given id once
    @modal_dialogs_rendered ||= Set.new
    return if @modal_dialogs_rendered.include?(html_id)
    @modal_dialogs_rendered << html_id

    content_for(:modal_dialogs) do
      render(:layout => '/layouts/modal_dialog', :locals => { :html_id => html_id, :header => header, :options => options }) do
        yield
      end
    end
  end
  def link_to_modal_dialog(name, html_id)
    link_to(name, "#", :class => "link_to_" + html_id)
  end
end
