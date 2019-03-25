from tethys_sdk.base import TethysAppBase, url_map_maker


class Teamhermes(TethysAppBase):
    """
    Tethys app class for Emergency Services Rerouter.
    """

    name = 'Emergency Services Rerouter'
    index = 'teamhermes:home'
    icon = 'teamhermes/images/icon.gif'
    package = 'teamhermes'
    root_url = 'teamhermes'
    color = '#2980b9'
    description = 'W19 CEEN 514 Team Hermes'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='teamhermes',
                controller='teamhermes.controllers.home'
            ),
        )

        return url_maps
