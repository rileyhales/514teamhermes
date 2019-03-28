from tethys_sdk.base import TethysAppBase, url_map_maker


class Teamhermes(TethysAppBase):
    """
    Tethys app class for Emergency Services Rerouter.
    """

    name = 'Emergency Services Rerouter'
    index = 'teamhermes:home'
    icon = 'teamhermes/images/42545-ambulance-icon.png'
    package = 'teamhermes'
    root_url = 'teamhermes'
    color = '#FF2828'
    description = 'This web app gives the nearest route to a few different emergency services from a point given by ' \
                  'the user. Users can also add obstacles to similuate different emergency situations.'
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
            UrlMap(
                name='proposal',
                url='teamhermes/proposal',
                controller='teamhermes.controllers.proposal'
            ),
            UrlMap(
                name='mockup',
                url='teamhermes/mockup',
                controller='teamhermes.controllers.mockup'
            ),
            UrlMap(
                name='router',
                url='teamhermes/router',
                controller='teamhermes.controllers.router'
            ),
        )

        return url_maps
